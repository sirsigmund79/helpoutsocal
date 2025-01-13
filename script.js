console.log("script.js is running");

// Check if window.__ENV__ exists BEFORE trying to access its properties
if (window.__ENV__) {
    const appsScriptUrl = window.__ENV__.APPS_SCRIPT_URL;
    console.log("Apps Script URL:", appsScriptUrl);

    // Only make the AJAX call if the URL is defined
    if (appsScriptUrl) {
        $.ajax({
            url: appsScriptUrl,
            // ... your AJAX settings
            success: function(response) {
                console.log("Success", response)
            },
            error: function(error) {
                console.log("Error", error)
            }
        });
    } else {
        console.error("APPS_SCRIPT_URL is undefined in window.__ENV__");
    }
} else {
    console.error("window.__ENV__ is undefined!");
}
let userLat, userLng;
let opportunities = [];
let seenOpportunities = new Set(JSON.parse(localStorage.getItem('seenOpportunities') || '[]'));
let loading = true;
const appsScriptUrl = window.__ENV__.APPS_SCRIPT_URL;

// Hey what are you looking here for?
// I knocked this out in a few hours with help from Gemini, don't bully my garbage code I'm BEGGING

console.log(`
    ___________
   < From Detroit to LA with love >
    -----------
           \\   ^__^
            \\  (oo)\\_______
               (__)\\       )\\/\\
                   ||----w |
                   ||     ||
   `);


function formatDate(dateString) {
    const today = new Date();
    const eventDate = new Date(dateString);

    const timeZone = "America/Los_Angeles"; // Define timezone once

    const todayPacific = new Date(today.toLocaleString("en-US", { timeZone }));
    const eventPacific = new Date(eventDate.toLocaleString("en-US", { timeZone }));

    todayPacific.setHours(13, 0, 0, 0);
    eventPacific.setHours(13, 0, 0, 0);

    const diffInDays = Math.round((eventPacific - todayPacific) / (1000 * 60 * 60 * 24));
    if (isNaN(diffInDays) || diffInDays < 0) { // Check for invalid dates OR dates in the past
        return null; // Return null for past events
    }
    if (diffInDays === 0) {
        return "Today";
    } else if (diffInDays === 1) {
        return "Tomorrow";
    } else {
        return eventPacific.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: timeZone // Use defined timezone variable
        });
    }
}

function convertToISO8601Pacific(dateString) {
    // console.log(dateString);
    const date = new Date(dateString);
    // console.log(date);
    const pacificOffset = date.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }).includes("PDT") ? "-07:00" : "-08:00";
    return `${dateString}T23:00:00${pacificOffset}`;
}

$(document).ready(function() {
    const zipCodeInput = document.getElementById('zipCode');
        // Check if the device is a mobile device
        function isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
    
        if (isMobileDevice()) {
            zipCodeInput.type = 'tel'; // Use tel input type for number pad
            zipCodeInput.inputMode = 'numeric'; // Further hint for numeric input
            zipCodeInput.pattern = '[0-9]*'; // Optional: Add a pattern for numeric input
            zipCodeInput.maxLength = 5; // Limit to 5 digits
        }
    $(".menu-toggle").click(function() {
        $("nav").toggleClass("open");
    });
    $("#cardContainer").html("<p>Enter your ZIP code to find volunteering opportunities near you</p>");
    fetchData();
    $("#contactForm").hide();

    $("#useZipCode").click(function() {
        const zip = $("#zipCode").val();
        if (zip.length != 5 || isNaN(zip)){
            alert("Please enter a valid zip code")
            return
        }
        if (zip) {
            $("#cardContainer").html("<p>Loading...</p>");
            getCoordinatesFromZip(zip).then(coords => {
                userLat = coords.lat;
                userLng = coords.lng;
                seenOpportunities.clear();
                localStorage.setItem('seenOpportunities', JSON.stringify(Array.from(seenOpportunities)));
                sortAndDisplay();
            }).catch(error => {
                console.error("Error getting coordinates for zip code:", error);
                alert("Could not get location from that ZIP code");
                $("#cardContainer").html("<p>Invalid Zip Code.</p>");
            });
        } else {
            $("#cardContainer").html("<p>Please enter a zip code.</p>");
        }
    });

    $("#dateFilter").change(function(){
        seenOpportunities.clear();
        localStorage.setItem('seenOpportunities', JSON.stringify(Array.from(seenOpportunities)));
        sortAndDisplay();
    });
    $("#submitContact").click(function() {
      const name = $("#name").val();
      const email = $("#email").val();
      if (!name) {
          alert("Name is required.");
          return;
      }
      if (!email) {
        alert("Email is required.");
        return;
    }

      const phone = $("#phone").val();

      // Store contact info (replace with actual submission later)
    //   console.log("Contact Info:", { name, email, phone });
      const eventTitle = $(".card h2").text(); // Get the event title
      // const eventLocation = $(".card h2").location(); // Get the event title)
      const timestamp = new Date().toISOString(); // Get the current timestamp
    //   const eventDate = $(".card p:contains('Date:')").text().replace("Date: ", "");
    const cardBubble = $(".card-bubble"); // Select the card bubble element
      const eventDateText = cardBubble.find("span:nth-child(1)").text(); // Get the date text from the first child span
      const eventLocation = $(".card p:contains('Location:')").text().replace(/Location: (.+)\(.+\)/, "$1").trim(); //Gets the location from the card
    //   console.log(eventDate);
    //   console.log(eventLocation);
      const dataToSend = {
          event: eventTitle,
          timestamp: timestamp,
          name: name,
          email: email,
          phone: phone,
          location: eventLocation,
          date: eventDateText
      };

      $.ajax({
        url: appsScriptUrl,
        type: "GET", // Use GET with JSONP
        dataType: "json", // Use JSONP
        data: dataToSend,
        success: function(response) {
            // console.log("Success:", response);
            if (response && response.result === "success") {
                console.log('success');
                $("#contactForm").hide();
                $("#thankYouMessage").show();
                $("#name").val('');
                $("#email").val('');
                $("#phone").val('');
            } else if (response && response.result === "error") {
                console.error("Apps Script Error:", response.error);
                alert("There was a server error. Please try again later.");
            } else {
                console.error("Unexpected Response:", response);
                alert("An unexpected error occurred. Please try again later.");
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
            if (jqXHR.status !== 0) { // Check if the error is not due to an abort
              alert("There was a network error. Please try again later."); // Only show the alert if it's a network error
            }
        }
        
    });
  });

  $("#keepLooking").click(function() {
      $("#thankYouMessage").hide();
      $("#cardContainer").show();
      displayNextCard(opportunities);
  });
});

function fetchData() {
    $.getJSON("data.json", function(data) {
        opportunities = data;
        loading = false;
        if (userLat && userLng){
            sortAndDisplay();
        }
    }).fail(function(error) {
        console.error("Error fetching JSON data:", error);
        $("#cardContainer").html("<p>Error loading data.</p>");
        loading = false;
    });
}

function getCoordinatesFromZip(zip) {
    return $.getJSON(`https://api.zippopotam.us/us/${zip}`).then(data => {
        if (data.places && data.places.length > 0) {
            return {
                lat: parseFloat(data.places[0].latitude),
                lng: parseFloat(data.places[0].longitude)
            };
        } else {
            throw new Error("Invalid zip code");
        }
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance * 0.621371;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function filterOpportunitiesByDate(opportunities, date_filter) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date_filter === "Today") {
      return opportunities.filter(opp => {
          const oppDate = new Date(convertToISO8601Pacific(opp.date));
        //   console.log(oppDate);
          return oppDate.getFullYear() === today.getFullYear() &&
                 oppDate.getMonth() === today.getMonth() &&
                 oppDate.getDate() === today.getDate();
      });
  } else if (date_filter === "Tomorrow") {
      return opportunities.filter(opp => {
          const oppDate = new Date(opp.date);
          return oppDate.getFullYear() === tomorrow.getFullYear() &&
                 oppDate.getMonth() === tomorrow.getMonth() &&
                 oppDate.getDate() === tomorrow.getDate();
      });
  } else if (date_filter === "Farther Out") {
      return opportunities.filter(opp => {
          const oppDate = new Date(opp.date);
          return oppDate > tomorrow; // Correct comparison
      });
  } else { // "All"
      return opportunities;
    
  }
}

function sortAndDisplay() {
    if (!userLat || !userLng || opportunities.length === 0) {
        if (!$("#zipCode").val()){
            $("#cardContainer").html("<p>Please enter a zip code.</p>");
        }
        return;
    }

    const dateFilter = $("#dateFilter").val();
    let filteredOpportunities = filterOpportunitiesByDate(opportunities, dateFilter);

    filteredOpportunities.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()){
            return dateA.getTime() - dateB.getTime();
        } else {
            const distA = calculateDistance(userLat, userLng, parseFloat(a.latitude), parseFloat(a.longitude));
            const distB = calculateDistance(userLat, userLng, parseFloat(b.latitude), parseFloat(b.longitude));
            return distA - distB;
        }
    });

    displayNextCard(filteredOpportunities);
}

function displayNextCard(opportunitiesToShow) {
    if (loading) {
        return;
    }

    if (!opportunitiesToShow || opportunitiesToShow.length === 0) {
        $("#cardContainer").html("<p>No more opportunities found.</p><p>Click 'Use Zip Code' to refresh results.</p>");
        return;
    }

    // Filter out past events *first*
    let upcomingOpportunities = opportunitiesToShow.filter(opportunity => {
        const formattedDate = formatDate(convertToISO8601Pacific(opportunity.date));
        return formattedDate !== null;
    });

    // Then, filter out seen opportunities
    let opportunitiesToShowFiltered = upcomingOpportunities.filter(opportunity => !seenOpportunities.has(opportunity.title));

    if (opportunitiesToShowFiltered.length === 0) {
        $("#cardContainer").html("<p>You've swiped through all *upcoming* events in the dates you have filtered. Re-loading events now!</p>"); // Updated message
        seenOpportunities.clear();
        localStorage.setItem('seenOpportunities', JSON.stringify(Array.from(seenOpportunities)));
        sortAndDisplay();
        return;
    }

    let card = opportunitiesToShowFiltered[0];
//   console.log(card.date);
  const distance = calculateDistance(userLat, userLng, parseFloat(card.latitude), parseFloat(card.longitude)).toFixed(1);
  const formattedDate = formatDate(convertToISO8601Pacific(card.date));
  let cardImage = "";
  let cardBackgroundStyle = "background-color: #f8f0e3;"; // Default pastel orange
  if (card.imageURL) {
      cardImage = `<img src="${card.imageURL}" alt="${card.title} Image" class="card-image">`;
      cardBackgroundStyle = ""; // Remove background color if there's an image
  } else {
    
    cardBackgroundStyle = ""; // Remove background color if there's an image
  }

  const cardHtml = `
  <div class="card" style="${cardBackgroundStyle}">
      <div class="card-bubble">
        <span>${formattedDate}</span>
        <span>${distance} mi</span>
          
      </div>
      <div class="image-container">
          ${cardImage}
      </div>
      <div class="card-content">
          <div class="text-background"><h2>${card.title}</h2></div>
          <div class="text-background"><h3>${card.organization}</h3></div>
          <div class="text-background details">
              <p><span>Location:</span> ${card.location}</p>
              <p><span>Time:</span> ${card.startTime} - ${card.endTime}</p>
              <p class = "description"><span>Description:</span> ${card.description}</p>
              <p><span>Website:</span><a href="${card.contact}" target="_blank">Learn More</a></p>
          </div>
      </div>
      <div class="button-container">
          <button id="swipeLeft">No</button>
          <button id="swipeRight">Volunteer</button>
      </div>
  </div>
`;

  $("#cardContainer").html(cardHtml);

  $("#swipeRight").click(function() {
    // var card = $("#cardContainer .card");
    // card.addClass("swiping");
    // card.addClass("swipe-right");
    $("#cardContainer").hide();
    $("#contactForm").show();
    seenOpportunities.add(card.title);
    localStorage.setItem('seenOpportunities', JSON.stringify(Array.from(seenOpportunities)));
});


$("#swipeLeft").click(function() {
    const card = $("#cardContainer .card");
    if (card.length === 0) return;

    card.addClass("swiping");
    card.addClass("swipe-left");
    let cardTitle = card.find("h2").text()
    seenOpportunities.add(cardTitle);
    localStorage.setItem('seenOpportunities', JSON.stringify(Array.from(seenOpportunities)));

    if (opportunitiesToShowFiltered.length === 1){
        displayNextCard([]);
    } else {
        displayNextCard(opportunitiesToShow);
    }
});


}