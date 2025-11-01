// // utils/delhiveryB2B.js
// import axios from "axios";
// import FormData from "form-data";
// import config from "../config/config.js";

// const BASE_URL = "https://ltl-clients-api-dev.delhivery.com";
// const TOKEN = config.DELHIVERY_API_KEY;

// const api = axios.create({
//   baseURL: BASE_URL,
//   headers: { Authorization: `Bearer ${TOKEN}` },
//   timeout: 30000,
// });

// // 1️⃣  Create or update warehouse
// export async function ensureClientWarehouse(wh) {
//   try {
//     const { data } = await api.post("/client-warehouse/create/", {
//       pin_code: wh.pin_code,
//       city: wh.city,
//       state: wh.state,
//       country: wh.country || "India",
//       name: wh.name,
//       address_details: {
//         address: wh.address_details.address,
//         contact_person: wh.address_details.contact_person,
//         phone_number: wh.address_details.phone_number,
//         email: wh.address_details.email || "",
//       },
//       ret_address: wh.ret_address,
//     });
//     return { created: true, data };
//   } catch (err) {
//     // already exists → update
//     if (
//       err.response &&
//       (err.response.status === 409 || err.response.status === 400)
//     ) {
//       const payload = {
//         cl_warehouse_name: wh.name,
//         update_dict: {
//           city: wh.city,
//           state: wh.state,
//           country: wh.country || "India",
//           address_details: {
//             address: wh.address_details.address,
//             contact_person: wh.address_details.contact_person,
//             phone_number: wh.address_details.phone_number,
//             email: wh.address_details.email || "",
//           },
//           ret_address: wh.ret_address,
//         },
//       };
//       const { data } = await api.patch("/client-warehouses/update", payload);
//       return { created: false, data };
//     }
//     throw err;
//   }
// }

// // 2️⃣  Manifest creation
// export async function createManifest(payload) {
//   const {
//     pickup_location_name,
//     payment_mode,
//     cod_amount,
//     weight,
//     dropoff_location,
//     invoices,
//     shipment_details,
//     dimensions,
//     billing_address,
//     freight_mode = "fop",
//     rov_insurance = true,
//     fm_pickup = false,
//   } = payload;

//   const fd = new FormData();

//   // Required fields with safe defaults
//   fd.append("pickup_location_name", pickup_location_name);
//   fd.append("payment_mode", payment_mode || "prepaid");
//   fd.append("cod_amount", String(cod_amount ?? 0));
//   fd.append("weight", String(Math.max(weight || 100, 100))); // at least 100g

//   // Strictly valid dropoff JSON
//   fd.append(
//     "dropoff_location",
//     JSON.stringify({
//       consignee_name: dropoff_location?.consignee_name || "Receiver",
//       address: dropoff_location?.address || "Default address",
//       city: dropoff_location?.city || "Mumbai",
//       state: dropoff_location?.state || "Maharashtra",
//       zip: String(dropoff_location?.zip || "400001"),
//       phone: dropoff_location?.phone || "9999999999",
//       email: dropoff_location?.email || "",
//     })
//   );

//   // At least one valid invoice
//   fd.append(
//     "invoices",
//     JSON.stringify([
//       {
//         ewaybill: invoices?.[0]?.ewaybill || "",
//         inv_num: invoices?.[0]?.inv_num || "INV-TEST",
//         inv_amt: invoices?.[0]?.inv_amt || 100,
//         inv_qr_code: "",
//       },
//     ])
//   );

//   // Shipment details must have valid box_count and weight > 0
//   fd.append(
//     "shipment_details",
//     JSON.stringify([
//       {
//         order_id: shipment_details?.[0]?.order_id || "TEST-ORDER",
//         box_count: 1,
//         description:
//           shipment_details?.[0]?.description || "Default description",
//         weight: Math.max(weight || 100, 100),
//         waybills: [],
//         master: false,
//       },
//     ])
//   );

//   // Dimensions must have non-zero positive numbers
//   fd.append(
//     "dimensions",
//     JSON.stringify([
//       {
//         box_count: 1,
//         length: 10,
//         width: 10,
//         height: 10,
//       },
//     ])
//   );

//   // Billing address mandatory keys
//   fd.append(
//     "billing_address",
//     JSON.stringify({
//       name: billing_address?.name || "Sender",
//       company: billing_address?.company || "Company",
//       consignor: billing_address?.consignor || "Sender",
//       address: billing_address?.address || "Origin Warehouse",
//       city: billing_address?.city || "Mumbai",
//       state: billing_address?.state || "Maharashtra",
//       pin: String(billing_address?.pin || "400001"),
//       phone: billing_address?.phone || "9999999999",
//       pan_number: billing_address?.pan_number || "ABCDE1234F",
//       gst_number: billing_address?.gst_number || "",
//     })
//   );

//   fd.append("freight_mode", freight_mode);
//   fd.append("rov_insurance", String(!!rov_insurance));
//   fd.append("fm_pickup", String(!!fm_pickup));

//   try {
//     const { data } = await api.post("/manifest", fd, {
//       headers: fd.getHeaders(),
//     });
//     return data;
//   } catch (err) {
//     console.error("Manifest error:", err.response?.data || err.message);
//     throw err;
//   }
// }

// // 2️⃣b  Manifest job status (to fetch LRNs)
// export async function getManifestStatus(job_id) {
//   const { data } = await api.get("/manifest", { params: { job_id } });
//   return data;
// }

// // 3️⃣  Pickup request
// export async function createPickupRequest({
//   client_warehouse,
//   pickup_date,
//   start_time,
//   expected_package_count,
// }) {
//   const { data } = await api.post("/pickup_requests", {
//     client_warehouse,
//     pickup_date,
//     start_time,
//     expected_package_count,
//   });
//   return data;
// }
