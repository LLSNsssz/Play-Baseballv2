import React from "react";
import { useRouter } from "next/router";
import { Box, Button, Toolbar, Typography, Container } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import Link from "next/link";
import { MEMBER_LOGOUT, PAGE_SEARCH } from "@/constants/endpoints";
import SearchBar from "./SearchBar";
import axiosInstance, { handleApiError } from "./axiosInstance";
import qs from "qs";
import { useAuth } from './AuthContext';

const Header: React.FC = () => {
  const { isLoggedIn, isEmailVerified, setAuthStatus, checkAuthStatus } = useAuth();
  const router = useRouter();

  const handleProtectedAction = async (path: string) => {
    if (isLoggedIn) {
      if (isEmailVerified) {
        router.push(path);
      } else {
        alert("이메일 인증이 필요합니다. 마이페이지에서 이메일 인증을 진행해 주세요.");
        router.push("/my");
      }
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axiosInstance.post(
          MEMBER_LOGOUT,
          {},
          { withCredentials: true }
      );
      if (response.status === 200) {
        localStorage.removeItem("Authorization");
        delete axiosInstance.defaults.headers.common["Authorization"];
        setAuthStatus(false, false);
        router.push("/");
      } else {
        throw new Error("로그아웃 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      handleApiError(error);
      localStorage.removeItem("Authorization");
      delete axiosInstance.defaults.headers.common["Authorization"];
      setAuthStatus(false, false);
      router.push("/");
    }
  };

  const handleSearch = (input: string) => {
    if (input) {
      const updatedQuery = { ...router.query, keyword: input };
      const url = `${PAGE_SEARCH}?${qs.stringify(updatedQuery)}`;
      window.location.href = url;
    }
  };

  return (
      <Box sx={{ backgroundColor: "#f5f5f5", width: "100%", py: 2 }}>
        <Container maxWidth="lg">
          <Toolbar
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 0,
              }}
          >
            <Typography
                variant="h6"
                component="div"
                sx={{
                  fontFamily: "Pretendard",
                  color: "#000",
                }}
            >
              <Link href="/" passHref>
                <HomeIcon sx={{ color: "#000" }} />
              </Link>
            </Typography>

            <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexGrow: 2,
                  justifyContent: "center",
                  mx: 2,
                  maxWidth: "60%",
                }}
            >
              <SearchBar onSearch={handleSearch} />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button onClick={() => handleProtectedAction("/exchange/write")} sx={{ color: "#000", fontFamily: "Pretendard" }}>
                판매하기
              </Button>
              <Button onClick={() => handleProtectedAction("/chat")} sx={{ color: "#000", fontFamily: "Pretendard" }}>
                채팅하기
              </Button>
              <Button onClick={() => isLoggedIn ? router.push("/my") : router.push("/login")} sx={{ color: "#000", fontFamily: "Pretendard" }}>
                마이페이지
              </Button>
              {isLoggedIn ? (
                  <Button onClick={handleLogout} sx={{ color: "#000", fontFamily: "Pretendard" }}>
                    로그아웃
                  </Button>
              ) : (
                  <Button onClick={() => router.push("/login")} sx={{ color: "#000", fontFamily: "Pretendard" }}>
                    로그인
                  </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </Box>
  );
};

export default Header;