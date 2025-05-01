import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import ClientPurchases from '../components/ClientPurchases';
import ClientRecommendations from '../components/ClientRecommendations';
import { useOutletContext } from 'react-router-dom';


export default function ClientProducts( ) {
    const { clientId, userData } = useOutletContext();
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Tabs
                value={tabIndex}
                onChange={handleTabChange}
                centered
                sx={{
                    "& .MuiTabs-indicator": { backgroundColor: "#A256E8" },
                    "& .MuiTab-root": {
                        color: "#A256E8",
                        "&.Mui-selected": { color: "#A256E8", fontWeight: "bold" },
                    },
                }}>
                <Tab label="רכישות" />
                <Tab label="המלצות" />
            </Tabs>

            {tabIndex === 0 ? <ClientPurchases clientId={clientId} userData={userData}/> : <ClientRecommendations clientId={clientId}/>}
        </Box>
    );
}
