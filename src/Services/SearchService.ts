
import * as Elasticsearch from 'elasticsearch';
import { ISearchParams, ISearchResult } from '../App';

let client = new Elasticsearch.Client({
  host: 'https://elasticsearch.codeformuenster.org:443',
  log: 'trace'
});

/**
 * General search handling
 */
class SearchService {

  /*
   * Execute search
   */
  public sendSearchToServer(searchParams: ISearchParams, callback: any) {

    const latitude = searchParams.latitude;
    const longitude = searchParams.longitude;

    let searchQuery: any = {
      index: 'places',
      body: {
        size : 100,
        query: {
          bool: {
            filter: {},
            must: [
              // {
              //   range: {
              //       date_start: {
              //           gte: '2017-11-01',
              //       }
              //   }
              // }
            ],
            should: [
              {
                query_string: {
                  query: (searchParams.searchQuery === undefined ? '' : searchParams.searchQuery)
                }
              }
            ]
          }
        },
        'sort': [
          { 'date_start': {'order': 'asc'}},
          {
            '_geo_distance': {
              'address.geo': {
                'lat': latitude,
                'lon': longitude
              },
              'order':         'asc',
              'unit':          'm',
              'distance_type': 'plane'
            }
          }
        ]
      }
    };
    if (searchParams.district === undefined || searchParams.district === '')  {
      searchQuery.body.query.bool.filter.geo_distance = {
        distance: '20km',
        'address.geo': {
          lat: latitude,
          lon: longitude
        }
      };
    } else {
      searchQuery.body.query.bool.filter.geo_shape = {
        'address.geometry': {
          'indexed_shape': {
            'index': 'stadtteile',
            'type': 'stadtteil',
            'id': (searchParams.district === undefined ? '' : searchParams.district),
            'path': 'geometry'
          }
        }
      };
    }
    if (searchParams.searchQuery !== undefined) {
      // searchQuery.body.q = searchParams.searchQuery + '*';
    }
    if ( searchParams.category) {
      searchQuery.body.query.bool.must.push({term: {'type': searchParams.category}});
    }
    // if ( searchParams.district) {
    //   searchQuery.body.query.bool.must.push({term: {'address.district': searchParams.district}});
    // }

    client
      .search(
        searchQuery,
        ((error: any, body: any) => {
          if (error) {
            console.trace('error', error.message);
          }

          let locations: Array<ISearchResult> = [];

          if (body && body.hits) {
            console.log('hits', body.hits.total);
            let results = body.hits.hits;
            for (let result of results) {
              const location = result._source;
              let features = location.payment_methods;
              if (location.wifi) {
                features.push('wifi');
              }
              if (location.name) {
                locations.push({
                  id: result._id,
                  lat: location.address.geo.lat,
                  lon: location.address.geo.lon,
                  name: location.name,
                  distance: result.sort[0],
                  type: location.type,
                  dateStart: location.date_start,
                  url: location.url,
                  dateEnd: location.date_end,
                  description: location.description,
                  properties: location.properties,
                });
              }
            }
          }
          console.log('locations', locations);

          callback(locations);

        })
      );
  }
}

export default SearchService;
