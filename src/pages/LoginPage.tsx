import { useState, type ChangeEvent, type FormEvent } from "react";

import { login } from "../api/authApi";
import { useAuth } from "../context/useAuth";

export default function LoginPage() {
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");

    const authContext = useAuth();
    const setUser = authContext.setUser;

    const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newUsername = event.target.value;
        setUsername(newUsername);
    };

    const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newPassword = event.target.value;
        setPassword(newPassword);
    };

    const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const enteredUsername = username.trim();
        const enteredPassword = password.trim();

        if (enteredUsername === "" || enteredPassword === "") {
            const validationMessage =
                "Vui lòng nhập đầy đủ username và password";

            setMessage(validationMessage);
            alert(validationMessage);
            return;
        }

        try {
            setIsLoggingIn(true);
            setMessage("");

            const loginResult = await login(
                enteredUsername,
                enteredPassword
            );

            const isLoginSuccessful = loginResult.success;

            if (isLoginSuccessful) {
                const loggedInUser = loginResult.user;

                if (loggedInUser !== undefined) {
                    setUser(loggedInUser);
                    setMessage("Đăng nhập thành công");
                    alert("Đăng nhập thành công");
                }

                return;
            }

            const errorMessage =
                loginResult.message ?? "Sai tài khoản hoặc mật khẩu";

            setMessage("Đăng nhập thất bại: " + errorMessage);
            alert("Đăng nhập thất bại: " + errorMessage);
        } catch (error) {
            const apiErrorMessage =
                "Không gọi được API login. Mở Console để xem lỗi chi tiết.";

            console.error("Lỗi khi gọi API login:", error);
            setMessage(apiErrorMessage);
            alert(apiErrorMessage);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <main className="login-page">
            <form className="login-panel" onSubmit={handleLoginSubmit}>
                <div>
                    <h1>Đăng nhập</h1>
                </div>

                <label>
                    Username
                    <input
                        type="text"
                        placeholder="Nhập username"
                        value={username}
                        onChange={handleUsernameChange}
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        placeholder="Nhập password"
                        value={password}
                        onChange={handlePasswordChange}
                    />
                </label>

                <button
                    className="primary-button"
                    type="submit"
                    disabled={isLoggingIn}
                >
                    {isLoggingIn ? "Đang đăng nhập..." : "Login"}
                </button>

                {message !== "" && (
                    <p className="form-message" role="alert">
                        {message}
                    </p>
                )}
            </form>
        </main>
    );
}
