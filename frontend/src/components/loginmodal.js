import React, { useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input, Button } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
const LoginModal = ({ isOpen, onClose, handleLogin }) => {
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailChange = (e) => {
    setUserEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(userEmail, password);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>로그인</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <div>
              <label>이메일:</label>
              <Input type="text" value={userEmail} onChange={handleEmailChange} />
            </div>
            <div>
              <label>비밀번호:</label>
              <Input type="password" value={password} onChange={handlePasswordChange} />
            </div>
            <Button type="submit" colorScheme="blue" mt={4}>
              로그인
            </Button>
             <Button type="submit" colorScheme="blue"ml={4} mt={4}> 
             <Link to={'/signup'}> 회원가입</Link>
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default LoginModal;
