import axios from 'axios';
import { Request, Response } from "express";

// Create an Axios instance
const apiClient = axios.create({
    baseURL: 'https://saferwebapi.com/v2',
    timeout: 10000,
});

// Add a request interceptor
apiClient.interceptors.request.use(
    (config) => {
        config.headers['x-api-key'] = process.env.SAFER_API_KEY;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if(error?.response?.data) {
            throw new Error(error.response.data.message);
        }
        return Promise.reject(error);
    }
);

const getUsDotData = async (USDotNumber: string) => {
    const response = await apiClient.get(`/usdot/snapshot/${USDotNumber}`);
    return response.data;
};

const getDataByUSDOT = async (req: Request, res: Response) => {
  try {
    const USDotNumber = Array.isArray(req.params.usdotnumber) ? req.params.usdotnumber[0] : req.params.usdotnumber;
    if (!USDotNumber || USDotNumber.length < 2) {
      return res.status(400).json({
        status: "error",
        message: "DOT number must be at least 2 characters"
      });
    }
    const response = await getUsDotData(USDotNumber);
    if (!response) {
      return res.status(404).json({
        status: "error",
        message: "No data found for this DOT number"
      });
    }
    res.status(200).json({
      status: "success",
      data: response
    });
  } catch (error: any) {
    console.error("USDOT API Error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch USDOT data"
    });
  }
};

export { getDataByUSDOT };
