import axios from "https://cdn.jsdelivr.net/npm/axios@1.7.9/+esm";
import { ApiException } from "../exception/errors.js";

const BASE = "http://localhost:3000";

async function request(path, method = "get", data) {
  try {
    const response = await axios({
      url: `${BASE}/${path}`,
      method,
      data,
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    throw new ApiException("Server error. Is JSON Server running?");
  }
}

export const hotels = {
  all: () => request("hotels"),
  one: (id) => request(`hotels/${id}`)
};

export const rooms = {
  all: (hotelId) => request(`rooms?hotelId=${hotelId}`),
  one: (id) => request(`rooms/${id}`),
  update: (id, status) => request(`rooms/${id}`, "patch", { status })
};

export const bookings = {
  all: (userId) => request(`bookings?userId=${userId}`),
  add: (data) => request("bookings", "post", data),
  cancel: (id) => request(`bookings/${id}`, "patch", { status: "cancelled" })
};

export function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(value);
}

export function dateText(value) {
  return new Date(value).toLocaleDateString("en-IN");
}

export function nights(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 86400000);
}

export function query(name) {
  return new URLSearchParams(location.search).get(name);
}

export function safe(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
