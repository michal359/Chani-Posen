import { React, createContext, useContext, useState, useEffect, Profiler } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import './App.css'
import Layout from "./components/Layout"
import HomeLayout from "./components/HomeLayout"
import Enter from "./pages/Enter"
import Login from './pages/LogIn'
import Registration from './pages/Registration'
import AdminHome from './pages/AdminHome'
import Clients from './pages/Clients'
import ClientDetails from './pages/ClientDetails'
import ClientTreatments from './components/ClientTreatments';
import ClientPersonalDetails from './components/ClientPersonalDetails';
import ClientProducts from './components/ClientProducts';
import ClientImages from './components/ClientImages';
import Products from './pages/Products'
import ProductDetails from './pages/ProductDetails'
import Posts from './pages/Posts'
import Notifications from './pages/Notifications'
import Overview from './pages/Overview'
import Accounts from './pages/Accounts'
import Schedule from './pages/Schedule'
import AdminProfile from './components/AdminProfile'

import { serverRequests } from './Api'


export const UserContext = createContext();

function App() {

  const [userData, setUserData] = useState({});

  useEffect(() => {
    serverRequests('GET', `users/current-user`, null)
      .then(response => {
        console.log(response);
        if (!response.ok) {
          return;
        }
        return response.json();
      })
      .then(data => {
        if (data && data.ok) {
          serverRequests('GET', `users/${data.user.user_id}`, null)
            .then(response => {
              console.log(response);
              if (!response.ok) {
                return;
              }
              return response.json();
            })
            .then(data => {
              if (data) {
                setUserData(data.user);
              }
              else
                setUserData(null);
            })
            .catch(error => {
              console.error('Error:', error);
            });
        }
        else
          setUserData(null);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }, []);


  return (

    <UserContext.Provider value={userData}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Enter />} />
            <Route path="login" element={<Login setUserData={setUserData} />} />
            <Route path="register" element={<Registration setUserData={setUserData} />} />
          </Route>

          <Route path="/admin-home" element={<HomeLayout setUserData={setUserData} userData={userData} role={1} />} >
            <Route index element={<AdminHome userData={userData} />} />
            <Route path="clients" element={<Clients userData={userData} />} />
            <Route path="clients/:clientId/*" element={<ClientDetails userData={userData} />}>
              <Route path="personal" element={<ClientPersonalDetails />} />
              <Route path="treatments" element={<ClientTreatments />} />
              <Route path="products" element={<ClientProducts />} />
              <Route path="images" element={<ClientImages userData={userData} />} />
              <Route index element={<Navigate to="personal" />} />
            </Route>



            <Route path="products" element={<Products userData={userData} />} />
            <Route path="products/:id" element={<ProductDetails userData={userData} />} />

            <Route path="posts" element={<Posts />} />
            <Route path="notifications" element={<Notifications userData={userData} />} />
            <Route path="overview" element={<Overview />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="profile" element={<AdminProfile />} />

          </Route>

        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  )
}

export default App








