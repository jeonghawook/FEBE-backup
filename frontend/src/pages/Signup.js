import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  HStack,
  VStack,
  Radio,
  RadioGroup,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import instance from '../api/interceptor';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const [signupError, setSignupError] = useState('');
  const [isUserAdmin, setIsUserAdmin] = useState(false);

   const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const response = await instance.post('/auth/signup', data);
      console.log(response.data);
      navigate('/');
 
    } catch (error) {
      setSignupError('다시 확인해주세요'); 
    }
  };

  return (
    <VStack >
      <form onSubmit={handleSubmit(onSubmit)} style={{ position: 'relative' }}>
        <FormControl isInvalid={errors.email} width="100%">
          <FormLabel>Email</FormLabel>
          <Input type="email" {...register('email', { required: true })} bg="white" />
          <FormErrorMessage>
            {errors.email && 'Email is required.'}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.nickname} width="100%">
          <FormLabel>Nickname</FormLabel>
          <Input type="text" {...register('nickname', { required: true })} bg="white" />
          <FormErrorMessage>
            {errors.nickname && 'Nickname is required.'}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.password} width="100%">
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            {...register('password', { required: true })}
            bg="white"
          />
          <FormErrorMessage>
            {errors.password && 'Password is required.'}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.confirm} width="100%">
          <FormLabel>Confirm Password</FormLabel>
          <Input
            type="password"
            {...register('confirm', { required: true })}
            bg="white"
          />
          <FormErrorMessage>
            {errors.confirm && 'Please confirm your password.'}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.phoneNumber} width="100%">
          <FormLabel>Phone Number</FormLabel>
          <Input
            type="tel"
            {...register('phoneNumber', { required: true })}
            bg="white"
          />
          <FormErrorMessage>
            {errors.phoneNumber && 'Please enter a valid phone number.'}
          </FormErrorMessage>
        </FormControl>

        <RadioGroup
          onChange={(value) => setIsUserAdmin(value === 'admin')}
          value={isUserAdmin ? 'admin' : 'user'}
          width="100%"
        >
          <FormLabel>User Type</FormLabel>
          <HStack spacing={4}>
            <Radio value="user">User</Radio>
            <Radio value="admin">Admin</Radio>
          </HStack>
        </RadioGroup>

        {isUserAdmin && (
          <FormControl isInvalid={errors.storeId} width="100%">
            <FormLabel>Store ID</FormLabel>
            <Input
              type="tel"
              {...register('storeId')}
              placeholder="없으면 놔두세요!"
              bg="white"
            />
            <FormErrorMessage>
              {errors.storeId && 'Please enter a valid store ID.'}
            </FormErrorMessage>
          </FormControl>
        )}

        <Button type="submit" width="100%" position="bottom" bottom={0}>
          Sign Up
        </Button>
     
        {signupError && (
      
         <Box color="red" mt={4} >
            {signupError}
          </Box>
      
     )}
   
      </form>
    </VStack>
  );
};

export default SignupPage;
