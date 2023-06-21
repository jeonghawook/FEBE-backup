import React, { useEffect, useState } from 'react';
import { Box, Button, Input, List, ListItem, VStack } from '@chakra-ui/react';
import useAuthStore from '../api/store';
import instance from '../api/interceptor';

function AdminPage() {
  const [listData, setListData] = useState([]);
  const { StoreId } = useAuthStore();
  const [number, setNumber] = useState('');

  useEffect(() => {
    fetchListData();
  }, []);

  const fetchListData = async () => {
    try {
      const response = await instance.get(`/stores/${StoreId}/waitings/list`);
      console.log(response);
      if (response) {
        const data = response.data;
        console.log(data);
        setListData(data);
      }
    } catch (error) {
      console.error('Failed to fetch list data:', error);
    }
  };

  const handleChange = (e) => {
    setNumber(e.target.value);
  };

  const handleClickEntering = async (userId) => {
    try {
      await instance.post(`/stores/${StoreId}/waitings/${userId}/entered`, {
        peopleCnt: parseInt(number),
      });
      fetchListData();
    } catch (error) {
      console.error('Failed to enter:', error);
    }
  };

  const handleClickEnter = async (waitingId) => {
    try {
      await instance.post(
        `/stores/${StoreId}/waitings/${waitingId}?status=ENTERED`
      );
      fetchListData();
    } catch (error) {
      console.error('Failed to mark as waiting:', error);
    }
  };

  const handleClickDelayed = async (waitingId) => {
    try {
      await instance.post(
        `/stores/${StoreId}/waitings/${waitingId}?status=DELAYED`
      );
      fetchListData();
    } catch (error) {
      console.error('Failed to mark as delayed:', error);
    }
  };

  const handleClickExited = async (waitingId) => {
    try {
      await instance.post(
        `/stores/${StoreId}/waitings/${waitingId}?status=EXITED`
      );
      fetchListData();
    } catch (error) {
      console.error('Failed to mark as delayed:', error);
    }
  };

  return (
    <VStack align="center" spacing={4} maxWidth="600px" mx="auto" mt={8}>
      <Box>
        <h2>List View (Admin)</h2>
        {listData.length === 0 ? (
          <Box>
            <Input type="number" value={number} onChange={handleChange} />
            <Button onClick={() => handleClickEntering(number)}>
              바로 입장
            </Button>
            <Box mt={2}>더 열심히 일하세요. 왜 손님이 없을까요?</Box>
          </Box>
        ) : (
          <List>
            <Input type="number" value={number} onChange={handleChange} />
            <Button onClick={() => handleClickEntering(number)}>
              바로 입장
            </Button>
            {listData.map((item) => (
              <ListItem key={item.id} py={2}>
                <Box>
                  <strong>ID:</strong> {item.id}
                </Box>
                <Box>
                  <strong>Status:</strong> {item.status}
                </Box>
                <Button onClick={() => handleClickEnter(item.id)}>입장</Button>
                <Button onClick={() => handleClickDelayed(item.id)}>연기</Button>
                <Button onClick={() => handleClickExited(item.id)}>퇴장</Button>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </VStack>
  );
}

export default AdminPage;
