import idb from 'idb';

let newMap;

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    //const port = 8000; // Change this to your server port
    //return `http://localhost:${port}/data/restaurants.json`;
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}`;
  }

  static get idbPromise() {
		if (!navigator.serviceWorker) {
			return Promise.resolve();
		} else {
			return idb.open('restaurants', 1, function (upgradeDb) {
        upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
        upgradeDb.createObjectStore('reviews', { keyPath: 'id' }).createIndex('restaurant_id', 'restaurant_id');
        upgradeDb.createObjectStore('pending-reviews', { keyPath: 'createdAt' });
			});
		}
  }

  static fetchRestaurants(callback) {
    DBHelper.idbPromise.then(db => {
      const trans = db.transaction('restaurants');
      const store = trans.objectStore('restaurants');

      store.getAll()
      .then(restaurants =>{
        if(restaurants.length > 1){
          //console.log('Restaurants getting from indexDB', restaurants);
          callback(null, restaurants)
        }else{
          fetch(`${DBHelper.DATABASE_URL}/restaurants`)
          .then(resp => resp.json())
          .then(resp => {
            const trans = db.transaction('restaurants', 'readwrite');
            const store = trans.objectStore('restaurants');    
            resp.forEach(restaurant => store.put(restaurant));
            
            //console.log('Restaurants from network and saved to indexDB' , resp);
            callback(null, resp);
          })
          .catch(err => {
            //console.log(`[Network fetch error: ${err}`);
            callback(err, null)
          })
        }
      })
    })    
  }


  static fetchReviews(id, callback){
    console.log('getting reviews');
    DBHelper.idbPromise.then(db => {
      if(!db){console.log('no idb');}
      
      /*getting data from reviews IDB*/
      const trans = db.transaction('reviews');
      const store = trans.objectStore('reviews');

      store.getAll()
      .then(reviews => {
        if(reviews.length > 0){
          console.log('looping in reviews in IDB', reviews);
          let data = [];        
          reviews.forEach(review => {
            if(review.restaurant_id == id) data.push(review);
          })
          
          /*getting data from pending-reviews IDB if there's an offline submission*/
          console.log('getting pending-reviews');
          const transPR = db.transaction('pending-reviews');
          const storePR = transPR.objectStore('pending-reviews');
          storePR.getAll().then(pendingreviews => {
            if(pendingreviews.length > 0){
              console.log('looping pending-reviews in IDB', pendingreviews);
              pendingreviews.forEach(pendingreview => {
                if(pendingreview.restaurant_id == id) data.push(pendingreview);
              })
            }
            
            if(data.length > 0){
              console.log('found reviews in IDB', data);
              callback(null, data);
            }else{
              //fetch from server
              fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`)
              .then(resp => resp.json())
              .then(resp => {
                console.log('reviews result from server', resp);
                const trans = db.transaction('reviews', 'readwrite');
                const store = trans.objectStore('reviews');
                resp.forEach(review => store.put(review));
                console.log('storing reviews in IDB', resp);
                callback(null, resp);
              })
              .catch(err => {
                callback(err, null);
              })
            }
            
          })

          
        }else{
          //fetch from server
          fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`)
          .then(resp => resp.json())
          .then(resp => {
            console.log('reviews result from server', resp);
            const trans = db.transaction('reviews', 'readwrite');
            const store = trans.objectStore('reviews');
            resp.forEach(review => store.put(review));
            console.log('storing reviews in IDB', resp);
            callback(null, resp);
          })
          .catch(err => {
            callback(err, null);
          })
        }
      })
      .catch(err => {
        console.log('nothing in IDB');
        return;
      })
    })
  }

  static fetchReviewsByRestaurantId(id, callback) {
    DBHelper.fetchReviews(id, (error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        console.log(`${typeof(reviews)}: reviews result from fetchReviewsByRestaurantId()`, reviews);      
        callback(null, reviews);
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        console.log('restaurant results from fetchRestaurantById()', restaurant);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    //return (`/img/${restaurant.photograph}`);

    //modified by Jimmy Mercado
    
    if(restaurant.photograph){
      return (`/pub/img/${restaurant.photograph}`);
      
    }
    //missing photo
    //return (`/images/${restaurant.id}`);
    return ('/pub/img/no-image');
    
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(self.newMap);
    return marker;
  } 

  //Added by Jimmy Mercado    
  static submitReview(data, callback){

    fetch(`${DBHelper.DATABASE_URL}/reviews`, {
      method: 'post',
      headers:{
        'content-type' : 'application/json'
      },
      referrer: 'no-referrer', 
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {        
      this.idbPromise.then(db => {
        const trans = db.transaction('reviews', 'readwrite');
        const store = trans.objectStore('reviews');
        store.put(data);
      });
      console.log('data stored in Server and IDB', data);
      callback(null, data);
    })
    .catch(err => {
      /*when offline*/
      console.log('Oops! you\'re offline!', err);
      
      data['createdAt'] = new Date().getTime();
      data['updatedAt'] = new Date().getTime();
      this.idbPromise.then(db => {
        const trans = db.transaction('pending-reviews', 'readwrite');
        const store = trans.objectStore('pending-reviews');
        store.put(data);
      });
      console.log('data stored in IDB pending-reviews', data);
      callback(null, data);
      
    })
  }

  static submitPendingReview(){
    console.log('submitPendingReview from pending-reviews IDB');
    this.idbPromise.then(db => {
      const trans = db.transaction('pending-reviews');
      const store = trans.objectStore('pending-reviews');
      store.getAll()
      .then(data => {
        if(data.length > 0){
          console.log('data from offline IDB', data);
          data.forEach(review => {            
            DBHelper.submitReview(review, (err, returnData) => {
              if(returnData != null){
                console.log('data returned from pending-reviews', returnData);
              }
            })
          })
          db.transaction('pending-reviews','readwrite').objectStore('pending-reviews').clear();
          console.log('data removed from pending-reviews', data);
        }
      })
      .catch(err => {
        console.log('error in saving pending reviews!', err);        
      })
    });
  }


  static updateFavorite(id, isFavorite){
    fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}/?is_favorite=${isFavorite}`, {
      method: 'put'
    })
    .then(res => res.json())
    .then(data => {
      DBHelper.idbPromise.then(db => {
        const trans = db.transaction('restaurants', 'readwrite');
        const store = trans.objectStore('restaurants');
        store.put(data);
      })
      return data;
    })
    .catch(err =>{
      /*when offline*/
      console.log('Oops! You clicked the Favorite button while you\'re offline!', isFavorite);   
    })
  }
}



export {DBHelper, newMap}
