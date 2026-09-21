import {
  hotels, rooms, bookings, money, dateText, nights,
  query, safe, today
} from "./api.js";
import { ValidationException } from "../exception/errors.js";

const USER = 1;
let hotelData = [];
let page = 1;
const perPage = 4;

addEventListener("DOMContentLoaded", start);

async function start() {
  if (id("hotelList")) return home();
  if (id("hotelDetails")) return details();
  if (id("roomList")) return roomPage();
  if (id("bookingForm")) return bookingPage();
  if (id("bookingList")) return history();
}

const id = (name) => document.getElementById(name);

async function home() {
  try {
    hotelData = await hotels.all();
    showHotels(hotelData);
    id("searchForm").addEventListener("submit", search);
    id("clearFilters").addEventListener("click", () => {
      id("location").value = "";
      id("maxPrice").value = "";
      page = 1;
      showHotels(hotelData);
    });
  } catch (error) { errorBox(id("hotelList"), error); }
}

function showHotels(data) {
  id("hotelCount").textContent = `${data.length} hotel(s) found`;
  id("noHotelsMessage").hidden = data.length > 0;
  if (!data.length) {
    id("hotelList").innerHTML = "";
    id("pagination").innerHTML = "";
    return;
  }

  const pages = Math.ceil(data.length / perPage);
  page = Math.min(page, pages);
  const start = (page - 1) * perPage;
  const list = data.slice(start, start + perPage);

  id("hotelList").innerHTML = list.map(hotelCard).join("");
  showPages(pages, data);
}

function hotelCard(hotel) {
  const image = hotel.image ||
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80";
  const tags = (hotel.amenities || []).slice(0, 3)
    .map(item => `<span class="tag">${safe(item)}</span>`).join("");

  return `<article class="card hotel-card">
    <img class="hotel-image" src="${safe(image)}" alt="${safe(hotel.name)}">
    <div class="card-body">
      <span class="badge">⭐ ${safe(hotel.rating)}</span>
      <h3>${safe(hotel.name)}</h3>
      <p>📍 ${safe(hotel.location)}</p>
      <p>${tags}</p>
      <p class="price">From ${money(hotel.price)} <small>/ night</small></p>
      <a class="button" href="details.html?id=${hotel.id}">View Hotel</a>
    </div>
  </article>`;
}

function showPages(total, data) {
  if (total <= 1) return id("pagination").innerHTML = "";
  id("pagination").innerHTML = `
    <button class="page-button" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>Previous</button>
    <span>Page ${page} of ${total}</span>
    <button class="page-button" data-page="${page + 1}" ${page === total ? "disabled" : ""}>Next</button>`;
  document.querySelectorAll(".page-button").forEach(button => {
    button.onclick = () => {
      page = Number(button.dataset.page);
      showHotels(data);
      scrollTo(0, 0);
    };
  });
}

function search(event) {
  event.preventDefault();
  page = 1;
  const text = id("location").value.trim().toLowerCase();
  const price = id("maxPrice").value;
  const result = hotelData.filter(hotel =>
    (!text || hotel.name.toLowerCase().includes(text) || hotel.location.toLowerCase().includes(text)) &&
    (!price || Number(hotel.price) <= Number(price))
  );
  showHotels(result);
}

async function details() {
  try {
    const hotel = await hotels.one(query("id"));
    id("hotelDetails").innerHTML = `<img class="details-image" src="${safe(hotel.image)}" alt="${safe(hotel.name)}">
      <div class="card-body"><span class="badge">⭐ ${safe(hotel.rating)}</span>
      <h2>${safe(hotel.name)}</h2><p>📍 ${safe(hotel.location)}</p>
      <p class="price">From ${money(hotel.price)} / night</p></div>`;
    id("amenitiesList").innerHTML = (hotel.amenities || [])
      .map(item => `<li>${safe(item)}</li>`).join("");
    id("viewRoomsButton").href = `rooms.html?hotelId=${hotel.id}`;
  } catch (error) { errorBox(id("hotelDetails"), error); }
}

async function roomPage() {
  try {
    const hotelId = query("hotelId");
    const [hotel, data] = await Promise.all([
      hotels.one(hotelId), rooms.all(hotelId)
    ]);
    id("hotelName").textContent = `${hotel.name} — Rooms`;
    id("hotelLocation").textContent = hotel.location;
    const available = data.filter(room => room.status.toLowerCase() === "available");
    id("noRoomsMessage").hidden = available.length > 0;
    id("roomList").innerHTML = available.map(room => `<article class="card room-card">
      <div><span class="badge">${safe(room.roomType)}</span>
      <h3>Room ${safe(room.roomNumber)}</h3><p>Available</p></div>
      <div><p class="price">${money(room.price)} <small>/ night</small></p>
      <a class="button" href="bookings.html?roomId=${room.id}&hotelId=${hotel.id}">Book Room</a></div>
    </article>`).join("");
  } catch (error) { errorBox(id("roomList"), error); }
}

async function bookingPage() {
  const hotelId = query("hotelId");
  const roomId = query("roomId");
  const form = id("bookingForm");

  try {
    const [hotel, room] = await Promise.all([
      hotels.one(hotelId), rooms.one(roomId)
    ]);
    const checkIn = id("checkIn");
    const checkOut = id("checkOut");
    const guests = id("guests");

    id("roomDetails").innerHTML = `<div class="summary">
      <strong>${safe(hotel.name)}</strong><span>Room ${safe(room.roomNumber)} · ${safe(room.roomType)}</span>
      <strong>${money(room.price)} / night</strong></div>`;
    checkIn.min = today();
    checkOut.min = today();

    const updateTotal = () => {
      id("totalAmount").textContent = money(nights(checkIn.value, checkOut.value) * Number(room.price));
    };
    checkIn.onchange = () => { checkOut.min = checkIn.value; updateTotal(); };
    checkOut.onchange = updateTotal;
    updateTotal();

    form.onsubmit = async event => {
      event.preventDefault();
      try {
        validate(checkIn.value, checkOut.value, guests.value);
        const totalNights = nights(checkIn.value, checkOut.value);
        const booking = await bookings.add({
          userId: USER, hotelId: Number(hotelId), roomId: Number(roomId),
          checkIn: checkIn.value, checkOut: checkOut.value,
          guests: Number(guests.value), totalAmount: totalNights * Number(room.price),
          status: "confirmed"
        });
        await rooms.update(room.id, "occupied");
        message(id("successMessage"), `Booking #${booking.id} confirmed successfully.`, "success");
        form.querySelector("button[type=submit]").disabled = true;
      } catch (error) { message(id("errorMessage"), error.message); }
    };
  } catch (error) { errorBox(id("roomDetails"), error); }
}

function validate(checkIn, checkOut, guests) {
  if (!checkIn || !checkOut) throw new ValidationException("Please select both dates.");
  if (checkOut <= checkIn) throw new ValidationException("Check-out must be after check-in.");
  if (checkIn < today()) throw new ValidationException("Check-in cannot be in the past.");
  if (!Number.isInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > 10)
    throw new ValidationException("Guests must be between 1 and 10.");
}

async function history() {
  try {
    const data = await bookings.all(USER);
    id("noBookingsMessage").hidden = data.length > 0;
    if (!data.length) return id("bookingList").innerHTML = "";
    const hotelsData = await hotels.all();
    const roomsData = (await Promise.all(hotelsData.map(h => rooms.all(h.id)))).flat();

    id("bookingList").innerHTML = data.map(booking => {
      const hotel = hotelsData.find(h => Number(h.id) === Number(booking.hotelId));
      const room = roomsData.find(r => Number(r.id) === Number(booking.roomId));
      const cancel = booking.status === "cancelled" ? "<span>Cancelled</span>" :
        `<button class="danger cancel-booking" data-id="${booking.id}">Cancel Booking</button>`;
      return `<article class="card booking-card"><div>
        <span class="badge ${booking.status}">${safe(booking.status)}</span>
        <h3>Booking #${booking.id}</h3>
        <p><strong>${safe(hotel?.name || "Unknown hotel")}</strong> · Room ${safe(room?.roomNumber || "-")}</p>
        <p>${dateText(booking.checkIn)} → ${dateText(booking.checkOut)} · ${booking.guests} guest(s) · ${nights(booking.checkIn, booking.checkOut)} night(s)</p>
      </div><div><p class="price">${money(booking.totalAmount)}</p>${cancel}</div></article>`;
    }).join("");

    document.querySelectorAll(".cancel-booking").forEach(button => {
      button.onclick = async () => {
        if (!confirm("Cancel this booking?")) return;
        try { await bookings.cancel(button.dataset.id); history(); }
        catch (error) { message(id("errorMessage"), error.message); }
      };
    });
  } catch (error) { errorBox(id("bookingList"), error); }
}

function message(element, text, type = "error") {
  element.textContent = text;
  element.className = `message ${type}`;
  element.hidden = false;
}

function errorBox(element, error) {
  if (element) element.innerHTML = `<div class="message error">${safe(error.message)}</div>`;
}
