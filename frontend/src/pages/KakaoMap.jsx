import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Input,
  List,
  ListItem,
  Text,
  VStack,
  Card,
  Stack,
  CardHeader,
  Heading,
  CardBody,
} from "@chakra-ui/react";
import axios from "axios";

function KakaoMap() {
  const [myLatitude, setMyLatitude] = useState(null);
  const [myLongitude, setMyLongitude] = useState(null);
  const [listData, setListData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedListData, setSearchedListData] = useState([]);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        navigator.geolocation.getCurrentPosition(function (position) {
          var lat = position.coords.latitude; // 위도
          var lon = position.coords.longitude; // 경도
          console.log(lat, lon);
          setMyLatitude(lat);
          setMyLongitude(lon);
        });
      } catch (error) {
        console.error("Failed to fetch coordinates:", error);
      }
    };

    fetchCoordinates();
  }, []);

  useEffect(() => {
    if (myLatitude !== null && myLongitude !== null) {
      const script = document.createElement("script");
      script.src =
        "//dapi.kakao.com/v2/maps/sdk.js?appkey=091ccaf6ebd3685465c663c2218360f5&libraries=services";
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        const mapContainer = document.getElementById("map");
        const mapOptions = {
          center: new window.kakao.maps.LatLng(myLatitude, myLongitude),
          level: 3,
        };

        const map = new window.kakao.maps.Map(mapContainer, mapOptions);

        window.kakao.maps.event.addListener(map, "click", function () {
          sendCoordinatesToBackend(map);
        });

        window.kakao.maps.event.addListener(map, "dragend", function () {
          sendCoordinatesToBackend(map);
        });

        sendCoordinatesToBackend(map);
      };
    }
  }, [myLatitude, myLongitude]);

  const sendCoordinatesToBackend = async (map) => {
    try {
      const bounds = map.getBounds();
      const swLatlng = bounds.getSouthWest();
      const neLatlng = bounds.getNorthEast();

      const response = await axios.post(
        "http://localhost:3300/places/coordinate",
        {
          swLatlng,
          neLatlng,
          myLatitude,
          myLongitude,
        }
      );

      if (response) {
        const storeData = response.data;

        setListData(storeData);
        console.log(listData);

        for (let i = 0; i < storeData.length; i++) {
          const position = storeData[i];
          console.log(position);
          const marker = new window.kakao.maps.Marker({
            map: map,
            position: new window.kakao.maps.LatLng(position.la, position.ma),
          });

          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div>${position.storename}</div>`,
          });

          window.kakao.maps.event.addListener(
            marker,
            "mouseover",
            makeOverListener(map, marker, infowindow)
          );
          window.kakao.maps.event.addListener(
            marker,
            "mouseout",
            makeOutListener(infowindow)
          );
        }
      }
    } catch (error) {
      console.error("Failed to send coordinates to backend:", error);
    }
  };

  function makeOverListener(map, marker, infowindow) {
    return function () {
      infowindow.open(map, marker);
    };
  }

  function makeOutListener(infowindow) {
    return function () {
      infowindow.close();
    };
  }

  const handleSearch = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3300/places/search?keyword=${searchTerm}`
      );

      if (response) {
        const storeData = response.data;
        setSearchedListData(storeData);
        console.log(response);
      }
    } catch (error) {
      console.error("Failed to search for places:", error);
    }
  };

  return (
    <VStack spacing={3} align="center">
      {" "}
      {/* Added align="center" to center the content */}
      <Box id="map" height="350px" width="500px" />
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search places..."
        width="500px"
        bg="white"
      />
      <Button onClick={handleSearch} colorScheme="blue" width="500px">
        Search
      </Button>
      <List>
        {searchedListData.length > 0 ? (
          <Box
            height="400px"
            overflowY="auto"
            overflowX="hidden"
            width="500px"
            sx={{
              "&::-webkit-scrollbar": {
                width: "8px",
                borderRadius: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            <Stack spacing="3" width="500px">
              {" "}
              {/* Added width="500px" to match the listData */}
              {searchedListData.map((store) => (
                <Card key={store.storeid} variant={"filled"} height="">
                  <Link to={`/store/${store.storeid}/page`}>
                    <CardHeader>
                      <Heading size="sm">{store.storename}</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text>Store ID: {store.address}</Text>
                      {/* Add more details or customize the card body */}
                    </CardBody>
                  </Link>
                </Card>
              ))}
            </Stack>
          </Box>
        ) : (
          <Box
            height="290px"
            overflowY="auto"
            overflowX="hidden"
            width="500px"
            sx={{
              "&::-webkit-scrollbar": {
                width: "8px",
                borderRadius: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            <Stack spacing="4" width="500px">
              {listData.map((store) => (
                <Card key={store.storeid} variant={"filled"}>
                  <Link to={`/store/${store.storeid}/page`}>
                    <CardHeader>
                      <Heading size="sm">{store.storename}</Heading>
                      <Text>대기중: {store.waiting}/{store.maxwaitingcnt}</Text>
                    </CardHeader>
                    <CardBody>
                      <Text>주소: {store.address}</Text>
                    </CardBody>
                  </Link>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </List>
    </VStack>
  );
}
export default KakaoMap;
