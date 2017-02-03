# redux-async-curd
Easiest way to create CRUD redux actions and reducer.

Most applications contains lots of simple CRUD operations. There are too many boilerplate codes to create such remote HTTP calls using just redux

redux-async-curd provides a way to use a simple contract instead of boilerplate codes to create CRUD calls.

All users need to do is:
* Create simple models (like JAVA Beans) using [yup](https://github.com/jquense/yup)
* Register reducers automatically created from models
* Connect CRUD actions (auto created) and results to your component
* Call actions

## Getting Started

TODO: The library needs to be distributed to NPM registry

### Prerequisites

[yup](https://github.com/jquense/yup)
[redux-thunk](https://github.com/gaearon/redux-thunk)
[react-redux](https://github.com/reactjs/react-redux)

### Installing

TODO:

```
npm install --save
```

## Usage

Define models:
```js
export const models = {
  employee: yup.object().shape({
    id:         yup.number().required().positive().isKey(true).integer().grid({hidden: true}),
    firstName:  yup.string().grid({width: 120, edit: true}),
    lastName:   yup.string().grid({width: 120, edit: true}),
    startDate:  yup.date().grid({width: 150, align: 'right', edit: true}),
    endDate:    yup.date().nullable(true).grid({width: 150, align: 'right', edit: true}),
    department: yup.string().grid({width: 180, edit: true}),
    email:      yup.string().grid({width: 220, edit: true}),
    salary:     yup.number().required().positive().integer().grid({width: 70, align: 'right', edit: true}),
    sex:        yup.string().grid({width: 60})
  })
}
export const asyncs = new AsyncModel(models)
```
Connect model(actions and results) to component:
```js
import {asyncs, models} from '../redux/models'

@asyncs.connect(models.employee)
export default class RestGrid extends Component {
}
```
Call actions like list:
```js
componentDidMount() {
  this.props.employeeActions.list();
}
```
Get result:
```js
const {data, loading} = this.props.employee;
```

## Notice

* Following actions are automatically generated:
```js
    {
            get,
            list,
            update,
            remove,
            add,
            reset
    }
```
    reset just clears the state and will not call server side
* The URL is automatically created by following logic:
```js
    static urlParams(data){
        return Object.keys(data).map(function(key) {
            let value = data[key]
            if(value === undefined || value === null){
                return undefined
            }
            value = (value instanceof Date) ? value.getTime() + '' : encodeURIComponent(value)
            return `${key}=${value}`
        }).filter(item => item !== undefined).join("&");
    }
    static fetchOption(method, payload){
        return {
            method,
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }
    }
    getFetchArgs(payload) {
        const url = `${this.name}/${this.crudType}`.toLowerCase()
        switch(this.crudType){
            case CRUD_TYPES.GET: 
            case CRUD_TYPES.LIST: 
                return [`${url}?${ActionCreator.urlParams(payload)}`, 
                    {credentials: 'same-origin'}]
            case CRUD_TYPES.UPDATE:
            case CRUD_TYPES.REMOVE:
            case CRUD_TYPES.ADD:
                return [url, ActionCreator.fetchOption('post', payload)]
            default:
                return [url]
        }
    }
  ```
* The returned data from server restful web service must be an array or a single model object
* The Date returned from server restful web service must be ISO standard format (YYYY-MM-DDThh:mm:ss.SSSZ)

## License

This project is licensed under the MIT License

