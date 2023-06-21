import { IsNotEmpty } from 'class-validator';
import { Reviews } from 'src/reviews/reviews.entity';


export class oneStoreDto {
    @IsNotEmpty()
    storeName: string;
    category: string;
    description: string;
    maxWaitingCnt: number;
    currentWaitingCnt: number;
    Ma: number;
    La: number;
    address: string;
    tableForTwo: number;
    tableForFour: number;
    rating: number;
    review: Reviews[];
}
