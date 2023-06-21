import axios from 'axios';
import jwt_decode from 'jwt-decode';
import useAuthStore from '../api/store';

const baseURL = 'http://localhost:3300';

const instance = axios.create({
  baseURL,
  timeout: 20000,
});

const isTokenExpired = (token) => {
  if (!token) {
    return true;
  }

  const decodedToken = jwt_decode(token);
  const currentTime = Date.now() / 1000; 

  return decodedToken.exp <= currentTime;
};

  // Request interceptor
  instance.interceptors.request.use(async (config) => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    console.log("intercepting")
    if (!accessToken) {
 
      return config;
    }

    if (!isTokenExpired(accessToken)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log("going")
      return config;
    } else {
      try {
        console.log("trying")
        const response = await axios.post(`${baseURL}/auth/refresh`,
         {},      {
          headers: {
            authorization: `Bearer ${refreshToken}`,
          },
        });
        
        const newAccessToken = response.data.accessToken;
       

        localStorage.setItem('accessToken', newAccessToken);
     
        // const decodedToken = jwt_decode(newAccessToken);
        // const { email, userId, isAdmin } = decodedToken;

        config.headers.Authorization = `Bearer ${newAccessToken}`;

        return config;
      } catch (error) {
        console.error(error);
      
      }
    }
  }, (error) => {
    return Promise.reject(error);
  });

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      console.error(error);
      return Promise.reject(error);
    }
  );

export default instance;
