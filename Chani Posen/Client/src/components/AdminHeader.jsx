import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Box, Drawer, List, ListItem, ListItemText, Divider, Tooltip } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import PostAddIcon from "@mui/icons-material/PostAdd";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircle from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { usePollingData } from '../hooks/usePollingData';


export default function AdminHeader({ setUserData, userData }) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unreadCount = usePollingData({
    url: `notifications/${userData?.user_id}/unread-count`,
    extractData: (res) => res.count,
    enabled: !!userData?.user_id
  });
  
  const clientCount = usePollingData({
    url: 'clients/count',
    extractData: (res) => res.totalClients,
    enabled: !!userData?.user_id
  });
  
  const productsCount = usePollingData({
    url: 'products/count',
    extractData: (res) => res.totalProducts,
    enabled: !!userData?.user_id
  });

  const handleNavigate = (page) => {
    navigate(`/${page}`);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    setUserData(null);
    navigate("/");
  };

  const getNotificationColor = (count) => {
    if (count >= 1 && count <= 5) return "#A9A9A9"; // אפור
    if (count >= 6 && count <= 10) return "#B68FFF"; // סגול
    if (count > 10) return "#FF7F7F"; // אדום בהיר
    return "transparent";
  };
  

  const menuItems = [
    { icon: <HomeIcon />, text: "דף הבית", page: "admin-home", tooltip: "מעבר לדף הבית" },
    {
      icon: <PeopleIcon />,
      text: "לקוחות",
      page: "admin-home/clients",
      tooltip: "ניהול לקוחות"
    },
    { icon: <ShoppingBagIcon />, text: "מוצרים", page: "admin-home/products", tooltip: "ניהול מוצרים" },
    { icon: <PostAddIcon />, text: "פוסטים", page: "admin-home/posts", tooltip: "יצירה וניהול פוסטים" },
    {
      icon: <NotificationsIcon />,
      text: "התראות",
      page: "admin-home/notifications",
      tooltip: "צפייה בהתראות",
      hasUnread: true
    },
  ];

  return (
    <Box sx={{ direction: "rtl" }}>
      <AppBar position="fixed" style={{ backgroundColor: "#333" }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="end"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" style={{ flexGrow: 1, textAlign: "right" }}>
            ברוכים הבאים, {userData?.first_name || "טוען..."}
          </Typography>

          <Tooltip title="התנתקות" arrow>
            <IconButton color="inherit" onClick={handleLogout}>
              <ExitToAppIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 8, p: 2 }}>
      </Box>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box role="presentation" width={250}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1 }}>
            <Typography variant="h6" style={{ textAlign: "right" }}>
              תפריט
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <List>
            {menuItems.map((item, index) => (
              <ListItem button key={index} onClick={() => handleNavigate(item.page)}>
                <Tooltip title={item.tooltip} arrow>
                  <IconButton color="inherit">{item.icon}</IconButton>
                </Tooltip>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}
                >
                  <ListItemText primary={item.text} style={{ textAlign: "right" }} />
                  {item.text === "לקוחות" && clientCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        backgroundColor: getNotificationColor(clientCount),
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        borderRadius: "16px",
                        px: 1.5,
                        py: 0.5,
                        ml: 1,
                        minWidth: "22px",
                        textAlign: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "0.3s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      {clientCount}
                    </Box>
                  )}
                  {item.text === "מוצרים" && productsCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        backgroundColor: getNotificationColor(productsCount),
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        borderRadius: "16px",
                        px: 1.5,
                        py: 0.5,
                        ml: 1,
                        minWidth: "22px",
                        textAlign: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "0.3s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      {productsCount}
                    </Box>
                  )}

                  {item.text === "התראות" && unreadCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        backgroundColor: getNotificationColor(unreadCount),
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        borderRadius: "16px",
                        px: 1.5,
                        py: 0.5,
                        ml: 1,
                        minWidth: "22px",
                        textAlign: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "0.3s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      {unreadCount}
                    </Box>

                  )}
                </Box>
              </ListItem>
            ))}

          </List>
          <Divider />
          <ListItem>
            <AccountCircle />
            <ListItemText
              primary={userData ? userData.username : "משתמש"}
              secondary={
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ cursor: "pointer", textAlign: "right" }}
                  onClick={() => {
                    handleNavigate("admin-home/profile");
                  }}
                >
                  צפייה בפרופיל
                </Typography>
              }
              style={{ textAlign: "right" }}
            />
          </ListItem>
        </Box>
      </Drawer>
    </Box>
  );
}
