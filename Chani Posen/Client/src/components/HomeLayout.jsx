import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import AdminHeader from "./AdminHeader";

const HomeLayout = ({ setUserData, userData }) => {
    const [loading, setLoading] = useState(true);

    const renderHeader = () => {

        useEffect(() => {
            if (userData && Object.keys(userData).length > 0) {
                setLoading(false);
            }
        }, [userData]);

        if (loading) {
            return <div>Loading...</div>;
        }

        switch (userData.role_id) {
            case 1:
                return (
                    <AdminHeader
                        key={userData.user_id}
                        setUserData={setUserData}
                        userData={userData}
                    />
                );
            case 2:
                return (
                    <>still working on it</>
                );
            default:
                console.log('no role id');
                return null;
        }
    };

    return (
        <div className="site-wrapper">
            {renderHeader()}
            <main>
                <Outlet />
            </main>
            {/* <Footer /> */}
        </div>
    );
};

export default HomeLayout;
