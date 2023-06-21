import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ChakraProvider } from '@chakra-ui/react';


const root = createRoot(document.getElementById('root'));
root.render(

  <React.StrictMode>
  <ChakraProvider>
      <App />
      </ChakraProvider>
  </React.StrictMode>
  
);

reportWebVitals();
