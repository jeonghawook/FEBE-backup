import { ReviewsRepository } from './../reviews/reviews.repository';
import { Injectable } from '@nestjs/common';
import { Stores } from './stores.entity';
import { CreateStoresDto } from './dto/create-stores.dto';
import { StoresSearchDto } from './dto/search-stores.dto';
import { StoresRepository } from './stores.repository';
import * as geolib from 'geolib';
import { createReadStream } from 'fs';
import * as csvParser from 'csv-parser';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { oneStoreDto } from './dto/getOne-store.dto';
@Injectable()
export class StoresService {
  constructor(
    @InjectRedis('store') private readonly client: Redis,
    @InjectRedis('waitingManager') private readonly redisClient: Redis,
    private storesRepository: StoresRepository,
    private reviewsRepository: ReviewsRepository,
    private readonly elasticsearchService: ElasticsearchService,
  ) { }

  async searchRestaurants(
    southWestLatitude: number,
    southWestLongitude: number,
    northEastLatitude: number,
    northEastLongitude: number,
    sortBy?: 'distance' | 'name' | 'waitingCnt' | 'waitingCnt2' | 'rating',
  ): Promise<{ 근처식당목록: Stores[] }> {
    const restaurants = await this.storesRepository.findAll();

    const restaurantsWithinRadius = restaurants.filter((restaurant) => {
      const withinLatitudeRange =
        Number(restaurant.La) >= southWestLatitude &&
        Number(restaurant.La) <= northEastLatitude;
      const withinLongitudeRange =
        Number(restaurant.Ma) >= southWestLongitude &&
        Number(restaurant.Ma) <= northEastLongitude;
      return withinLatitudeRange && withinLongitudeRange;
    });

    // 거리 계산 로직
    const calculateDistance = (
      source: { latitude: number; longitude: number },
      target: { latitude: number; longitude: number },
    ): number => {
      const latDiff = Math.abs(source.latitude - target.latitude);
      const lngDiff = Math.abs(source.longitude - target.longitude);
      const approximateDistance = Math.floor(
        latDiff * 111000 + lngDiff * 111000,
      );
      return approximateDistance;
    };

    //user위치에 따른 거리값을 모든 sort조건에 포함시켜준다
    const userLocation = {
      latitude: southWestLatitude,
      longitude: southWestLongitude,
    };
    restaurantsWithinRadius.forEach((restaurant) => {
      const distance = calculateDistance(userLocation, {
        latitude: Number(restaurant.La),
        longitude: Number(restaurant.Ma),
      });
      restaurant.distance = distance;
    });

    //정렬로직모음
    restaurantsWithinRadius.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distance || 0) - (b.distance || 0);
      } else if (sortBy === 'name') {
        return a.storeName.toUpperCase() < b.storeName.toUpperCase() ? -1 : 1;
      } else if (sortBy === 'waitingCnt') {
        return a.currentWaitingCnt - b.currentWaitingCnt;
      } else if (sortBy === 'waitingCnt2') {
        return b.currentWaitingCnt - a.currentWaitingCnt;
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0;
    });

    return { 근처식당목록: restaurantsWithinRadius };
  }

  //sorting //쿼리 searching 따로

  //키워드로 검색부분 //sorting 추가 //전국 식당으로 //가장 가까운 순으로?
  async searchStores(
    keyword: string,
    sort: 'ASC' | 'DESC',
    column: string,
  ): Promise<StoresSearchDto[]> {
    const category = [
      '한식',
      '양식',
      '중식',
      '일식',
      '양식',
      '기타',
      '분식',
      '까페',
      '통닭',
      '식육',
      '횟집',
      '인도',
      '패스트푸드',
      '패밀리레스트랑',
      '김밥(도시락)',
      '소주방',
    ];
    if (category.includes(keyword)) {
      if (keyword === '중식') {
        keyword = '중국식';
      } else if (keyword === '양식') {
        keyword = '경양식';
      }
      const searchByCategory = await this.storesRepository.searchByCategory(
        keyword,
        sort,
        column,
      );
      return searchByCategory;
    } else {
      const searchStores = await this.storesRepository.searchStores(
        keyword,
        sort,
        column,
      );
      return searchStores;
    }
  }

  //상세조회 + 댓글
  async getOneStore(storeId: number): Promise<oneStoreDto> {
    const redisStore = await this.redisClient.hgetall(`store:${storeId}`);
    if (redisStore == null) {
      const store = await this.storesRepository.getOneStore(storeId);
      const rating: number = await this.getRating(storeId);
      return {
        storeName: store.storeName,
        category: store.category,
        description: store.description,
        maxWaitingCnt: store.maxWaitingCnt,
        currentWaitingCnt: store.currentWaitingCnt,
        Ma: store.Ma,
        La: store.La,
        address: store.address,
        tableForFour: store.tableForFour,
        tableForTwo: store.tableForTwo,
        rating: rating,
        review: store.reviews
      }
    }
    const review = await this.reviewsRepository.findAllReviews(storeId)
    console.log(redisStore)
    return {

      storeName: redisStore.storename,
      category: redisStore.category,
      description: redisStore.description,
      maxWaitingCnt: parseInt(redisStore.maxWaitingCnt),
      currentWaitingCnt: parseInt(redisStore.currentWaitingCnt),
      Ma: parseFloat(redisStore.Ma),
      La: parseFloat(redisStore.La),
      address: redisStore.address,
      tableForFour: parseInt(redisStore.tableForFour),
      tableForTwo: parseInt(redisStore.tableForTwo),
      rating: parseInt(redisStore.rating),
      review: review
    };
  }

  //상점 추가
  async createStore(createUserDto: CreateStoresDto): Promise<Stores> {
    const store = await this.storesRepository.createStore(createUserDto);
    return store;
  }

  //postgres 좌표 업데이트
  async fillCoordinates() {
    const stores = await this.storesRepository.findAll();
    for (let i = 0; i < stores.length; i++) {
      await this.storesRepository.fillCoordinates(
        stores[i],
        stores[i].Ma,
        stores[i].La,
      );
      //console.log(`updated coordinates of ${stores[i].storeId}`);
    }
  }

  //rating 가져오기
  async getRating(storeId: number): Promise<number> {
    const averageRating = await this.reviewsRepository.getAverageRating(
      storeId,
    );
    return averageRating;
  }

  async searchStores2(
    keyword: string,
    sort: 'ASC' | 'DESC',
    column: string,
  ): Promise<StoresSearchDto[]> {
    const category = [
      '한식',
      '양식',
      '중식',
      '일식',
      '양식',
      '기타',
      '분식',
      '까페',
      '통닭',
      '식육',
      '횟집',
      '인도',
      '패스트푸드',
      '패밀리레스트랑',
      '김밥(도시락)',
      '소주방',
    ];
    //console.log('Check')
    if (category.includes(keyword)) {
      if (keyword === '중식') {
        keyword = '중국식';
      } else if (keyword === '양식') {
        keyword = '경양식';
      }
      //console.log("카테고리")
      const searchByCategory = await this.searchByCategory(
        keyword,
        sort,
        column,
      );
      return searchByCategory;
    } else {
      //console.log("키워드")
      const searchStores = await this.searchByKeyword(keyword, sort, column);
      return searchStores;
    }
  }
  async searchByCategory(
    keyword: string,
    sort: 'ASC' | 'DESC' = 'ASC',
    column: string,
  ): Promise<any[]> {
    const stores = await this.elasticsearchService.search<any>({
      index: 'stores_index',
      _source: ['storeid', 'storename', 'category', 'maxwaitingcnt', 'cycletime', 'tablefortwo',
        'tableforfour',],
      sort: column
        ? [
          {
            [column.toLocaleLowerCase()]: {
              order: sort === 'ASC' ? 'asc' : 'desc',
            },
          },
        ]
        : undefined,
      query: {
        bool: {
          should: [
            {
              wildcard: {
                category: `*${keyword}*`,
              },
            },
          ],
        },
      },
      size: 10000,
    });
    const storesData = stores.hits.hits.map(async (hit) => {
      const storeDatas = hit._source;
      const storeId: number = storeDatas.storeid;
      const redisAll = await this.redisClient.hgetall(
        `store:${storeId}`
      );
      if (redisAll == null) {
        const rating: number = await this.getRating(storeId);
        const datas = {
          maxWaitingCnt: storeDatas.maxwaitingcnt,
          cycleTime: storeDatas.cycletime,
          tableForTwo: storeDatas.tablefortwo,
          tableForFour: storeDatas.tableforfour,
          availableTableForTwo: storeDatas.tablefortwo,
          availableTableForFour: storeDatas.tableforfour,
          rating
        };

        await this.redisClient.hset(`store:${storeId}`, datas); //perfomance test needed
        const currentWaitingCnt = 0;
        return { ...storeDatas, rating, currentWaitingCnt };
      }
      const currentWaitingCnt = redisAll.currentWaitingCnt;
      const rating = redisAll.rating;
      return { ...storeDatas, rating, currentWaitingCnt };
    });
    const resolvedStoredDatas = await Promise.all(storesData);
    return resolvedStoredDatas;
  }
  //햄버거로 찾기
  async searchByKeyword(
    keyword: string,
    sort: 'ASC' | 'DESC' = 'ASC',
    column: string,
  ): Promise<any[]> {
    const stores = await this.elasticsearchService.search<any>({
      index: 'stores_index',
      _source: ['storeid', 'storename', 'category', 'maxwaitingcnt', 'cycletime', 'tablefortwo',
        'tableforfour',],
      sort: column
        ? [
          {
            [column.toLocaleLowerCase()]: {
              order: sort === 'ASC' ? 'asc' : 'desc',
            },
          },
        ]
        : undefined,
      query: {
        bool: {
          should: [
            {
              wildcard: {
                storename: `*${keyword}*`,
              },
            },
            {
              wildcard: {
                address: `*${keyword}*`,
              },
            },
          ],
        },
      },
      size: 10000,
    });
    const storesData = stores.hits.hits.map(async (hit) => {
      const storeDatas = hit._source;
      const storeId: number = storeDatas.storeid;
      const redisAll = await this.redisClient.hgetall(
        `store:${storeId}`,
      );
      console.log(redisAll)
      if (redisAll == null) {
        const rating: number = await this.getRating(storeId);
        const datas = {
          maxWaitingCnt: storeDatas.maxwaitingcnt,
          cycleTime: storeDatas.cycletime,
          tableForTwo: storeDatas.tablefortwo,
          tableForFour: storeDatas.tableforfour,
          availableTableForTwo: storeDatas.tablefortwo,
          availableTableForFour: storeDatas.tableforfour,
          rating
        };
        await this.redisClient.hset(`store:${storeId}`, datas); //perfomance test needed
        const currentWaitingCnt = 0;
        return { ...storeDatas, rating, currentWaitingCnt };
      }
      const currentWaitingCnt = redisAll.currentWaitingCnt;
      const rating = redisAll.rating
      return { ...storeDatas, rating, currentWaitingCnt };
    });
    const resolvedStoredDatas = await Promise.all(storesData);
    return resolvedStoredDatas;
  }

  //elastic 좌표로 주변 음식점 검색 (거리순)

  async searchByCoord(
    sort: 'ASC' | 'DESC' = 'ASC',
    column: string,
    page: number,
    southWestLatitude: number,
    southWestLongitude: number,
    northEastLatitude: number,
    northEastLongitude: number,
    myLatitude: string,
    myLongitude: string,
  ): Promise<any[]> {
    const pageSize = 1000;
    // const from = (page - 1) * pageSize;
    const stores = await this.elasticsearchService.search<any>({
      index: 'geo_test',
      size: pageSize,
      //  from: from,
      sort: column
        ? [
          {
            [column.toLocaleLowerCase()]: {
              order: sort === 'ASC' ? 'asc' : 'desc',
            },
          }, //다시 인덱싱 하면, 필요한 값만 넣어줄 예정 toLowerCase 안할것!
        ]
        : undefined,
      query: {
        geo_bounding_box: {
          location: {
            top_left: {
              lat: northEastLatitude, // 37.757791370664556
              lon: southWestLongitude, //126.79520112345595
            },
            bottom_right: {
              lat: southWestLatitude, // 37.754606432266826
              lon: northEastLongitude, //126.77778001399787
            },
          },
        },
      },
    });
    const result = await Promise.all(stores.hits.hits.map(async (hit: any) => {
      const storesFound = hit._source;
      const storeId: number = storesFound.storeid;
      const redisAll = await this.redisClient.hgetall(
        `store:${storeId}`,
      );
      if (redisAll == null) {
        const average: number = await this.getRating(storeId);
        const datas = {
          maxWaitingCnt: storesFound.maxwaitingcnt,
          cycleTime: storesFound.cycletime,
          tableForTwo: storesFound.tablefortwo,
          tableForFour: storesFound.tableforfour,
          availableTableForTwo: storesFound.tablefortwo,
          availableTableForFour: storesFound.tableforfour,
          rating: average,
        };
        await this.redisClient.hset(`store:${storeId}`, datas); //perfomance test needed
        const rating = average;
        const latitude: number = storesFound.location.lat;
        const longitude: number = storesFound.location.lon;
        const start = { latitude: myLatitude, longitude: myLongitude };
        const end = { latitude: latitude, longitude: longitude };
        const distance = geolib.getDistance(start, end);
        const currentWaitingCnt = 0
        return { ...storesFound, distance: distance + 'm', rating, currentWaitingCnt };
      }
      const latitude: number = storesFound.location.lat;
      const longitude: number = storesFound.location.lon;
      const start = { latitude: myLatitude, longitude: myLongitude };
      const end = { latitude: latitude, longitude: longitude };
      const distance = geolib.getDistance(start, end);
      const currentWaitingCnt = redisAll.currentWaitingCnt;
      const rating = redisAll.rating
      return { ...storesFound, distance: distance + 'm', rating, currentWaitingCnt };
    }));

    result.sort((a, b) => {
      const distanceA = parseFloat(a.distance);
      const distanceB = parseFloat(b.distance);
      return distanceA - distanceB;
    });
    console.log(result)
    return result;
  }


  //redis 에 storeId 랑 좌표 넣기
  async addStoresToRedis(): Promise<void> {
    const stores = await this.storesRepository.findAll();
    for (let i = 0; i < stores.length; i++) {
      await this.client.geoadd(
        'stores',
        stores[i].Ma,
        stores[i].La,
        String(stores[i].storeId),
      );
      console.log(`${i + 1}번째 음식점 좌표 redis 저장 완료`);
    }
  }

  //두 좌표 사이의 거리
  getDistanceWithCoordinates(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    function toRadians(degrees: number): number {
      return degrees * (Math.PI / 180);
    }
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  //반경 내의 음식점 조회
  async getNearbyStoresByRadius(
    coordinates: {
      Ma: number;
      La: number;
    },
    sortBy?: string,
  ): Promise<Stores[]> {
    const latitude = coordinates.Ma,
      longitude = coordinates.La;

    const nearbyStores = await this.client.georadius(
      'stores',
      longitude,
      latitude,
      1,
      'km',
      'withdist',
    );

    const nearbyStoresIds = nearbyStores.map((store) => store[0]);
    const nearbyStoresDistances = nearbyStores.map((store) => Number(store[1]));

    const stores = await this.storesRepository.findStoresByIds(nearbyStoresIds);

    for (const store of stores) {
      store.distance = Math.ceil(
        nearbyStoresDistances[nearbyStoresIds.indexOf(String(store.storeId))] *
        1000,
      );
    }

    return stores.sort((a, b) => {
      if (sortBy === 'name') {
        return a.storeName.toUpperCase() < b.storeName.toUpperCase() ? -1 : 1;
      } else if (sortBy === 'waitingCnt') {
        return a.currentWaitingCnt - b.currentWaitingCnt;
      } else if (sortBy === 'waitingCnt2') {
        return b.currentWaitingCnt - a.currentWaitingCnt;
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });
  }

  //box 내의 음식점 조회
  async getNearbyStoresByBox(
    coordinates: {
      swLatlng: { La: number; Ma: number };
      neLatlng: { La: number; Ma: number };
    },
    sortBy?: string,
  ): Promise<Stores[]> {
    const { swLatlng, neLatlng } = coordinates;

    const userLatitude: number = (swLatlng.La + neLatlng.La) / 2;
    const userLongitude: number = (swLatlng.Ma + neLatlng.Ma) / 2;

    const width = this.getDistanceWithCoordinates(
      swLatlng.La,
      swLatlng.Ma,
      swLatlng.La,
      neLatlng.Ma,
    );
    const height = this.getDistanceWithCoordinates(
      swLatlng.La,
      swLatlng.Ma,
      neLatlng.La,
      swLatlng.Ma,
    );

    const nearbyStores = await this.client.geosearch(
      'stores',
      'FROMLONLAT',
      userLongitude,
      userLatitude,
      'BYBOX',
      width,
      height,
      'km',
      'withdist',
    );

    const nearbyStoresIds = nearbyStores.map((store) => store[0]);
    const nearbyStoresDistances = nearbyStores.map((store) => Number(store[1]));

    const stores = await this.storesRepository.findStoresByIds(nearbyStoresIds);

    for (const store of stores) {
      store.distance = Math.ceil(
        nearbyStoresDistances[nearbyStoresIds.indexOf(String(store.storeId))] *
        1000,
      );
    }

    return stores.sort((a, b) => {
      if (sortBy === 'name') {
        return a.storeName.toUpperCase() < b.storeName.toUpperCase() ? -1 : 1;
      } else if (sortBy === 'waitingCnt') {
        return a.currentWaitingCnt - b.currentWaitingCnt;
      } else if (sortBy === 'waitingCnt2') {
        return b.currentWaitingCnt - a.currentWaitingCnt;
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });
  }

  //CSV 부분
  async processCSVFile(inputFile: string): Promise<void> {
    const batchSize = 100;

    return new Promise<void>((resolve, reject) => {
      let currentBatch: any[] = [];
      createReadStream(inputFile, { encoding: 'utf-8' })
        .pipe(csvParser())
        .on('error', (error) => {
          //console.error('Error reading CSV file:', error);
          reject(error);
        })
        .on('data', async (row: any) => {
          if (row['상세영업상태코드'] === '01') {
            currentBatch.push(row);

            if (currentBatch.length === batchSize) {
              await this.storesRepository.processCSVFile(currentBatch);
              currentBatch = [];
            }
          }
        })
        .on('end', async () => {
          if (currentBatch.length > 0) {
            await this.storesRepository.processCSVFile(currentBatch);
          }
          resolve();
        })
        .on('finish', () => {
          //console.log('CSV processing completed.');
        });
    });
  }

  //카카오 좌표 부분
  async updateCoordinates(): Promise<void> {
    try {
      const stores = await this.storesRepository.getStoreAddressId();

      for (const store of stores) {
        const { address, oldAddress, storeId } = store;

        try {
          let coordinates = await this.storesRepository.getCoordinate(address);

          if (!coordinates) {
            coordinates = await this.storesRepository.getCoordinate(oldAddress);
          }
          if (!coordinates) continue;

          const La = coordinates[0];
          const Ma = coordinates[1];

          await this.storesRepository.updateCoord(La, Ma, storeId);

          //console.log(
          //`Updated coordinates for address: ${address}`,
          //La,
          //Ma,
          //storeId,
          //);
        } catch (error) {
          //console.error(
          //`Error updating coordinates for address: ${address} and ${oldAddress}`,
          //error,
          //);
        }
      }
    } catch (error) {
      //console.error('Error occurred during database operation:', error);
    }
  }
}
