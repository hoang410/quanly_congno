import axios from "axios";
import type { LoginResponse } from "../types/auth";


const API_URL: string = "https://script.google.com/macros/s/AKfycbwIP_smiFTtNGov_U_ofch8YPLs81orEtR_lOjwGRAMN92B6LQSfwRpgC2JajEkcAhe/exec"

export const login = async(username:string, password:string): Promise<LoginResponse> => {
    const response = await axios.post(
        API_URL,
        JSON.stringify({
            action:"login",
            username:username,
            password:password
        }),
        {
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            }
        }
    )
    return response.data;
}

