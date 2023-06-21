  import React, { useState } from 'react';
  import  useAuthStore from '../api/store';
  import jwt_decode from 'jwt-decode'
  import instance  from '../api/interceptor';
  import { Link } from 'react-router-dom';
  import LoginModal from './loginmodal';
  import { Button,Icon,VStack,Box,HStack  } from '@chakra-ui/react';
  import { FaUser } from 'react-icons/fa'

  const Header = () => {
    const { isLogIn, email, isAdmin, logout, login } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);



    const handleLogout = async(e) => {
      try{
      const response = await instance.delete(`/auth/logout`);
      
      logout();
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      }catch(error){
        console.log(error)
      }
    };

    const handleLogin = async (userEmail, password) => {
      //e.preventDefault();
      try {
        const response = await instance.post(`/auth/login`, {
          email :userEmail,
          password,
        });
        console.log("login")
        if (response) {
          const refreshToken = response.data.refreshToken;
          const accessToken = response.data.accessToken;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          const decodedToken = jwt_decode(accessToken);

          const { isAdmin, email, userId, StoreId } = decodedToken;
          console.log(decodedToken)
          login(email, isAdmin, userId,StoreId);
        }
      } catch (error) {
        console.error('Login failed:', error);
      }
    };

    return (
      <Box
  >
      <header>
        <nav>
          {isLogIn && isAdmin ? (
            <ul>
              <li>
                Welcome, {email}
              </li>
              <li>
              <Link to={'/admin'}>AdminPage</Link>
                <button onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          ) : isLogIn && !isAdmin ? (
    

   <VStack align="center">
              <Box>
                {email}
                <Button
                  size="sm"
                  icon={<Icon as={FaUser} boxSize={4} />}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Box>
            </VStack>

            
          ) : (
            <ul>
      
            <VStack align="center">
                  <Button
                    size="sm"
                    icon={<Icon as={FaUser} boxSize={4} />}
                    onClick={() => setShowLoginModal(true)}
                    className="person-button"
                  
                  >
                  <Box as={FaUser} boxSize={4} />
                  </Button>
                  {showLoginModal && (
                    <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} handleLogin={handleLogin} />
                  )}
            </VStack>
              
            </ul>
          )}
        </nav>
      </header>
      </Box>
    );
  };

  export default Header;
