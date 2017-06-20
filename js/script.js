// Global variables
var map;
var infoWindow;

// Location information to be loaded into knowckout variables
var locations = [
  {
    name : "BTS Theme Park",
    address : "Berjaya Times Square, 1, Jalan Imbi, Imbi, 55100 " +
      "Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia",
    lat : 3.1422145,
    lng : 101.7105405,
    wikiSearch: "Berjaya Times Square Theme Park"
  },
  {
    name : "Dataran Merdeka",
    address : "Jalan Raja, City Centre, 50050 Kuala Lumpur, " +
      "Wilayah Persekutuan Kuala Lumpur, Malaysia",
    lat : 3.1477582,
    lng : 101.6934235,
    wikiSearch: "Merdeka Square, Kuala Lumpur"
  },
  {
    name : "KLCC Aquarium",
    address : "Kuala Lumpur Convention Centre, Kuala Lumpur City, " +
      "50088 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia",
    lat : 3.1537798,
    lng : 101.7132214,
    wikiSearch: "Aquaria KLCC"
  },
  {
    name : "KL Bird Park",
    address : "KL Bird Park, 920, Jalan Cenderawasih, Tasik Perdana, " +
      "50480 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia",
    lat : 3.1430959,
    lng : 101.688736,
    wikiSearch: "Kuala Lumpur Bird Park"
  },
  {
    name : "KL Tower",
    address : "Jalan P Ramlee, Kuala Lumpur, 50250 Kuala Lumpur, " +
      "Wilayah Persekutuan Kuala Lumpur, Malaysia",
    lat : 3.1528152,
    lng : 101.7036534,
    wikiSearch: "Kuala Lumpur Tower"
  },
  {
    name : "Petronas Twin Towers",
    address : "Kuala Lumpur City Centre, 50450 Kuala Lumpur, " +
      "Wilayah Persekutuan Kuala Lumpur, Malaysia",
    lat : 3.1579,
    lng : 101.7116,
    wikiSearch: "Petronas Towers"
  },
];

// Location model - defines what information to be stored into Location object
var Location = function(data) {
  var self = this;

  self.name = data.name;
  self.lat = data.lat;
  self.lng = data.lng;
  self.active = ko.observable(false);
  self.wikiSearch = ko.observable(data.wikiSearch);

  // Create marker for this location with instructions what to do when marker
  // is clicked
  self.createMarker = (function() {
    self.marker = new google.maps.Marker({
      position: {lat: self.lat, lng: self.lng},
      map: map,
      title: self.name
      });
      map.bounds.extend(self.marker.position);
      self.marker.addListener('click', function() {
        getMoreInfo(self);
      });
    })();

};

// ViewModel which ties together what is displayed and database model
var ViewModel = function(){
  var self = this;

  // Load all Location instances into a knowckout array
  this.searchString = ko.observable('');
  this.wiki_article = ko.observable('');
  this.locationsList = ko.observableArray([]);

  locations.forEach(function(data) {
      self.locationsList.push( new Location(data));
  });
  map.fitBounds(map.bounds);

  // Initialize current location to first instance in the location array
  this.currentLocation = ko.observable(locationsList()[0]);

  // Clear active state and closes info window
  this.resetActiveState = function() {
    self.currentLocation().active(false);
    self.currentLocation().marker.setAnimation(null);
    infoWindow.close();
    self.wiki_article('');
  };

  // Displays filter list of locations and hides markers of filtered
  // locations based on user input search string
  this.filteredLocations = ko.computed(function() {
      resetActiveState();
      return self.locationsList().filter(function (location) {
          var display = true;
          if (self.searchString() !== ''){
              if (location.name.toLowerCase().indexOf
                (self.searchString().toLowerCase()) !== -1){
                  display = true;
              }else {
                  display = false;
              }
          }
          location.marker.setVisible(display);
          return display;
      });
  });

  // Retrieves information from Google and Wikipedia for selected location
  this.getMoreInfo = function(clickedLocation) {
    resetActiveState();
    self.currentLocation(clickedLocation);
    self.currentLocation().active(true);
    self.currentLocation().marker.setAnimation(google.maps.Animation.BOUNCE);

    // Retrieves information from Wikipedia
    var articleUrl;
    var articleContent;
    var wikiURL = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' +
      self.currentLocation().wikiSearch() +
      '&format=json&callback=wikiCallback';
    var wikiTimeout = setTimeout(function () {
      alert("failed to load wikipedia page");
    }, 8000);

    $.ajax({
      url: wikiURL,
      dataType: "jsonp"
    }).done(function(response) {
      clearTimeout(wikiTimeout);

      // Displays content and url of first article only in area below map
      // and then invokes google street view services to get panorama
      articleUrl = response[3][0];
      articleContent = response[2][0];
      self.wiki_article(articleContent +
        '<br><br>Click here for more information: <a href ="' + articleUrl +
        '">' + self.currentLocation().name + '</a>');
      streetViewService.getPanoramaByLocation(self.currentLocation()
        .marker.position, radius, getStreetView);
    });

    // Retrieves panorama street view image from Google
    var streetViewService = new google.maps.StreetViewService();
    var radius = 50;
    function getStreetView(data, status) {
      if (status == google.maps.StreetViewStatus.OK) {
        var nearStreetViewLocation = data.location.latLng;
        var heading = google.maps.geometry.spherical.computeHeading(
          nearStreetViewLocation, self.currentLocation().marker.position);
          infoWindow.setContent('<h5 id="infowindow-header">' +
            self.currentLocation().name + '</h5><div id="pano"></div>');
          var panoramaOptions = {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 20
            }
          };
        var panorama = new google.maps.StreetViewPanorama(
          document.getElementById('pano'), panoramaOptions);
      } else {
        infowindow.setContent('<h5 id="infowindow-header">' +
          self.currentLocation().name +
          '</h5><div>No Street View Found</div>');
      }
    }
    infoWindow.open(map, self.currentLocation().marker);

    // center map on current marker
    map.panTo(self.currentLocation().marker.position);
  };
};

// Initialize Google map and info window
function initMap() {
    map = new google.maps.Map(document.getElementById('map'));
    map.bounds = new google.maps.LatLngBounds();
    infoWindow = new google.maps.InfoWindow({
        content: ''
    });
    google.maps.event.addListener(infoWindow, 'closeclick', function(){
        resetActiveState();
    });
}

// This is the first function called when google api is invoked in the html file
var app = function() {
    initMap();
    ko.applyBindings(ViewModel);
};

// Fallback for Google Maps Api
function googleMapsApiErrorHandler(){
    console.log('Error: Google maps API could not be loaded');
    $('body').prepend('<p id="map-error">Sorry we are having trouble' +
      'loading google maps API, please try again in a moment.</p>');
}
