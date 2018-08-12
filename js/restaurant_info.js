import {DBHelper, newMap}  from './dbhelper';

let restaurant;
let reviews;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/*initialize onsubmit*/
const form = document.getElementById("form1");

form.addEventListener('submit', function(event) {
  event.preventDefault();
  let formData = getFormData();
  
  DBHelper.submitReview(formData, (err, returnData) => {
    if(returnData != null){
      console.log('data returned', returnData);
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(returnData));
      form.reset();
    }
  })

});


/**
 * Initialize leaflet map
 */
var initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiamltbXltZXJjYWRvIiwiYSI6ImNqaWtzZWZ1czFlamYzcXBmemNreDg2aDQifQ.YQGY_pIwe5x68Q7q8Dvufw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(self.newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}


/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (err, restaurant) => {
      self.restaurant = restaurant;
      console.log(`isFavorite = ${restaurant.is_favorite}`)
      if (!restaurant) {
        console.error(err);
        return;
      }

      DBHelper.fetchReviewsByRestaurantId(id, (err, reviews) => {
        console.log('from top', reviews);
        self.restaurant.reviews = reviews;
        if (!reviews) {
          console.error(err);
          return;
        }
        fillRestaurantHTML();
        callback(null, restaurant)
      })
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {

  /*
  * Added by Jimmy Mercado
  * Favorite Checkbox
  */
  const favorite = document.getElementById('chkFavorite');
  
  let checked = false;
  if(typeof restaurant.is_favorite==='undefined'){
    checked = false;      
  }else{
    checked = (restaurant.is_favorite.toString().toLowerCase() === 'true');
  }
  favorite.checked = checked;

  favorite.addEventListener('change', event => {
    DBHelper.updateFavorite(restaurant.id, event.target.checked);
  });

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  /*
  * Added by Jimmy Mercado
  * include srcset and alt attrib
  */
  image.setAttribute('alt', 'Photo of ' + restaurant.name);
  const imgPath = DBHelper.imageUrlForRestaurant(restaurant);

  const imgPathFileName = imgPath;
  const imgFileExtesion = '.jpg';

  image.setAttribute("srcset", imgPathFileName + imgFileExtesion + ' 1140w, ' + imgPathFileName + '_400px' + imgFileExtesion + ' 900w, ' + imgPathFileName + '_270px' + imgFileExtesion + ' 650w, ' + imgPathFileName + imgFileExtesion + ' 645w ' )

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  title.setAttribute('tabindex', 0);
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    noReviews.setAttribute('tabindex', 0);
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/*
 * Added by Jimmy Mercado
 * Create review HTML and add it to the webpage.
*/
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  //encapsulate with div tag
  const div = document.createElement('div');
  div.className = 'reviewHeader';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.setAttribute('tabindex', 0);
  //li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toDateString();
  date.setAttribute('tabindex', 0);
  //li.appendChild(date);
  div.innerHTML = name.outerHTML + ' ' + date.outerHTML;
  li.appendChild(div);

  const rating = document.createElement('div');
  rating.className = 'ratingBox';
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.setAttribute('tabindex', 0);
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


/*collect all form entries*/
function getFormData(){
  let formData = {"restaurant_id": self.restaurant.id};
  formData['name'] = form.name.value;
  formData['rating'] = form.rating.value;
  formData['comments'] = form.comments.value;
  console.log('data collected from web form', formData);
  return formData;
}