import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import instance from "../api/interceptor";
import useAuthStore from "../api/store";
import LoginModal from "../components/loginmodal";
import jwt_decode from "jwt-decode";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  Select,
  Card,
} from "@chakra-ui/react";

function StorePage() {
  const { storeId } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [number, setNumber] = useState("");
  const { isLogIn, email, isAdmin, logout, login } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [error, setError] = useState("");
  const [reviewInput, setReviewInput] = useState("");
  const [ratingNumber, setRatingNumber] = useState("");

  useEffect(() => {
    fetchStoreData();
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      const response = await instance.get(`/places/${storeId}`);
      const storeData = response.data;
      setStoreData(storeData);
      console.log(storeData);
    } catch (error) {
      console.error("Failed to fetch store data:", error);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (value >= 1 && value <= 4) {
      setNumber(value);
      setError("");
    } else {
      setNumber("");
      setError("웨이팅은 1~4명!");
    }
  };

  const handleReviewChange = (e) => {
    setReviewInput(e.target.value);
  };
  const handleRating = (e) => {
    setRatingNumber(e.target.value)
  }
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {

      const response = await instance.post(`stores/${storeId}/reviews`, {
        review: reviewInput,
        rating: parseInt(ratingNumber),
      });
      console.log(response.data);
      const newReview = {
        rating: parseInt(ratingNumber),
        review: reviewInput,
      };
      setStoreData((prevStoreData) => ({
        ...prevStoreData,
        review: [...prevStoreData.review, newReview],
      }));
      setReviewInput("");
      setRatingNumber("")

    } catch (error) {
      console.error("Failed to send review to backend:", error);
    }
  };

  const handleClick = async (e) => {
    e.preventDefault();
    if (isLogIn) {
      try {
        const response = await instance.post(`/stores/${storeId}/waitings`, {
          peopleCnt: parseInt(number),
        });
        console.log(response.data);
      } catch (error) {
        console.error("Failed to send number to backend:", error);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = async (userEmail, password) => {
    try {
      const response = await instance.post(`/auth/login`, {
        email: userEmail,
        password,
      });
      console.log("login");
      if (response) {
        const refreshToken = response.data.refreshToken;
        const accessToken = response.data.accessToken;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        const decodedToken = jwt_decode(accessToken);

        const { isAdmin, email, userId, StoreId } = decodedToken;
        console.log(decodedToken);
        login(email, isAdmin, userId, StoreId);
      }
      setShowLoginModal(false);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (!storeData) {
    return <div>Loading...</div>;
  }

  return (
    <VStack>
      <Box p={4}>
        <Heading
          size="lg"
          mb={1}
          backgroundColor="white"
          borderRadius="10px"
          textAlign="center"
        >
          {storeData.storeName}
        </Heading>
        <Text textAlign="center" mb={10}>
          {storeData.category}
        </Text>
        <Text fontSize="md" mb={4}>
          주소: {storeData.address}
        </Text>

        <form onSubmit={handleClick}>
          <Box background="pink" padding="4px" borderRadius="10px">
            <Flex align="center" justify="space-between">
              <Text>별점 {storeData.rating}</Text>
              <Flex align="center">
                <Input
                  type="number"
                  id="number"
                  value={number}
                  width="50px"
                  onChange={handleChange}
                  backgroundColor="white"
                />
                <Button type="submit" colorScheme="blue" ml={2}>
                  예약하기
                </Button>
              </Flex>
            </Flex>
          </Box>
          {error && (
            <Box textAlign="right" color="red.500" fontSize="sm" mt={2}>
              {error}
            </Box>
          )}
        </form>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          handleLogin={handleLogin}
        />
        <form onSubmit={handleReviewSubmit}>
          <Flex align="center" justify="space-between" mt={4}>
            <Select
              value={ratingNumber}
              onChange={handleRating}
              placeholder="별점"
              width="25%"
              marginRight="1rem"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </Select>
            <Input
              type="text"
              value={reviewInput}
              onChange={handleReviewChange}
              placeholder="리뷰쓰기"
              width="70%"
              marginRight="1rem"
              background="white"
            />
            <Button type="submit" colorScheme="blue">
              댓글달기
            </Button>
          </Flex>
        </form>
        <Box paddingTop="200px">
          <Box
            height="300px"
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

            {storeData.review.map((review, index) => (
              <Card key={index} variant="filled" backgroundColor="white" mt={2}>
                <Box height="100px">
                  <Box height="100px">
                    <Flex justifyContent="space-between" alignItems="center">
                      <Text>아이디부분</Text>
                      <Text>{review.rating} 점</Text>
                    </Flex>
                    <Text>내용: {review.review}</Text>
                  </Box>


                </Box>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </VStack>

  );
}

export default StorePage;
