// import axios from "axios";
// import config from "../config/config.js";

// // API token
// const API_TOKEN = config.DELHIVERY_API_KEY;

// // Delhivery API Base URL
// const STAGING_URL = "https://staging-express.delhivery.com";
// // const PRODUCTION_URL = 'https://track.delhivery.com';

// // Function to create a warehouse
// const createWarehouse = async (warehouseData) => {
//   console.log(
//     warehouseData,
//     "warehouseDatawarehouseDatawarehouseDatawarehouseDatawarehouseData"
//   );

//   try {
//     const response = await axios.post(
//       `${STAGING_URL}/api/backend/clientwarehouse/create/`,
//       warehouseData,
//       {
//         headers: {
//           Authorization: `Token ${API_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("Warehouse created successfully:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Error creating warehouse:", error);
//     throw error;
//   }
// };

// // Function to create shipment
// const createShipment = async (shipmentData) => {
//   try {
//     const response = await axios.post(
//       `${STAGING_URL}/api/cmu/create.json`,
//       shipmentData,
//       {
//         headers: {
//           Authorization: `Bearer ${API_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );
//     console.log("Shipment created successfully:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Error creating shipment:", error);
//     throw error;
//   }
// };

// // Function to create pickup request
// const createPickup = async (pickupData) => {
//   try {
//     const response = await axios.post(
//       `${STAGING_URL}/fm/request/new/`,
//       pickupData,
//       {
//         headers: {
//           Authorization: `Token ${API_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );
//     console.log("Pickup request created successfully:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Error creating pickup request:", error);
//     throw error;
//   }
// };

// // Function to call the correct delivery partner API
// const deliveryPartnerAPI = async (partner, endpoint, params = {}) => {
//   try {
//     let url = `${STAGING_URL}${endpoint}`;
//     let method = "POST";
//     let data = params;

//     if (partner === "DELHIVERY") {
//       if (endpoint === "/api/backend/clientwarehouse/create/") {
//         method = "PUT";
//         data = params;
//       } else if (endpoint === "/api/cmu/create.json") {
//         method = "POST";
//         data = `format=json&data=${JSON.stringify(params)}`;
//       } else if (endpoint === "/fm/request/new/") {
//         method = "POST";
//         data = params;
//       }

//       console.log("Request:", { url, method, headers: `Bearer ${API_TOKEN}` });

//       const response = await axios.request({
//         method,
//         url,
//         headers: {
//           Authorization: `Bearer ${API_TOKEN}`,
//           Accept: "application/json",
//           "Content-Type":
//             endpoint === "/api/cmu/create.json"
//               ? "application/x-www-form-urlencoded"
//               : "application/json",
//         },
//         data,
//       });
//       console.log(response, "response from api");

//       return response.data;
//     }

//     throw new Error("Unsupported partner");
//   } catch (error) {
//     console.error(
//       "Error creating warehouse:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// };

// export { deliveryPartnerAPI, createPickup, createWarehouse };
