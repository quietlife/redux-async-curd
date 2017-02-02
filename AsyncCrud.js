const Util = require('../rules/Util')

export default class AsyncCrud {
    constructor(name, schema) {
        // this.actions = new Actions(name)
        this.schema = schema
        this.name = name
        this.marks = ActionCreator.getActionTypes(name)
        const schemaObj = schema.fields
        const fields = Object.keys(schemaObj)
        this.dateFields = fields.filter(field => schemaObj[field].describe().type === 'date')
        this.keyFields = fields.filter(field => schemaObj[field].isKey())
        if(this.keyFields.length === 0){
            this.keyFields = fields
        }
    }
    createActions() {
        return {
            get: this.createSingleAction(CRUD_TYPES.GET),
            list: this.createSingleAction(CRUD_TYPES.LIST),
            update: this.createSingleAction(CRUD_TYPES.UPDATE),
            remove: this.createSingleAction(CRUD_TYPES.REMOVE),
            add: this.createSingleAction(CRUD_TYPES.ADD),
            reset: () => {return {type: ActionCreator.getActionTypes(this.name).RESET}}
        }
    }
    createSingleAction(crudType = CRUD_TYPES.LIST) {
        const {name, marks} = this
        // const marks = ActionCreator.getActionTypes(name) 
        const actions = new ActionCreator(name, crudType) 
        const {creators} = actions
        const actionAsync = (payload) => {
            return (dispatch, getState) => {
                dispatch(creators.request(payload))
                // const args = actions.getFetchArgs(payload)
                return fetch(...actions.getFetchArgs(payload))
                    .then(response => response.json())
                    .then(json => {
                        const out = {
                            request: payload, data: json, crudType
                        }
                        dispatch(creators.ok(out))
                        // if (options.ok.callback) options.ok.callback(dispatch, getState, response, ...args)
                        return json;
                    })
                    .catch(error => {
                        console.log(error)
                        const errorOut = {
                            actionAsync,
                            request: payload, error: error, crudType
                        }
                        dispatch(creators.error(errorOut))
                        // if (options.error.callback) options.error.callback(dispatch, getState, errorOut, ...args); 
                        // if (!options.noRethrow) throw errorOut;
                    })
            }
        }
        // Object.assign(actionAsync, {marks, crudType});
        // actionAsync.options = options;
        return actionAsync;
    }
    parseDates(item) {
        if (item) {
            for (const f of this.dateFields) {
                if (item[f])
                    item[f] = new Date(item[f])
            }
        }
        return item
    }
    getOkData(state, crudType, data = []) {
        const oldData = state.data || []
        if (!Array.isArray(data)) {
            data = [data]
        }
        // if (this.dateFields.length > 0) {
        //     data = data.map(item => this.parseDates(item))
        // }
        data = data.map(item => this.schema.cast(item))
        const equals = this.getEqualsFunction()
        switch (crudType) {
            case CRUD_TYPES.LIST: return data
            case CRUD_TYPES.ADD:
                return [...data, ...oldData]
            case CRUD_TYPES.REMOVE:
                return oldData.filter(item => data.findIndex(d => equals(d, item)) < 0)
            case CRUD_TYPES.GET: 
                if(data.length === 0){
                    return oldData
                }
                const d = data[0]
                const index = oldData.findIndex(item => equals(d, item))
                if(index < 0){
                    return [d, ...oldData]
                }else{
                    const result = oldData.slice()
                    result[index] = d
                    return result
                }
            case CRUD_TYPES.UPDATE:
                return oldData.map(item => {
                    const found = data.find(d => equals(d, item))
                    return found ? found : item
                })
            default:
                return oldData
        }
    }
    getEqualsFunction() {
        const {keyFields, dateFields} = this

        return (a, b) => {
            for(const f of keyFields){
                if(dateFields.indexOf(f) >= 0){
                    // va = a[f].getTime()
                    // vb = b[f].getTime()
                    if(!Util.dateEqual(a[f], b[f])){
                        return false
                    }
                }else if(a[f] !== b[f]){
                    return false
                }
            }
            return true
        }
    }
    createReducer() {
        const {marks, keyField} = this
        // const {marks, crudType} = actionlnfo
        return (state = defaultState, action) => {
            const {payload} = action
            switch (action.type) {
                case marks.REQUEST:
                    return {
                        ...state, request: payload, loading: true, error: undefined
                    }
                case marks.OK:
                    return {
                        ...state, loading: false,
                        data: this.getOkData(state, payload.crudType, payload.data), error: undefined
                    }
                case marks.ERROR:
                    return {
                        ...state, loading: false, error: payload.error
                    }
                case marks.RESET:
                    return defaultState
                default:
                    return state
            }
        }
    }
}
const defaultState = {
    loading: false,
    data: []
}
const ASYNC_META = {
    REQUEST: "REQUEST",
    OK: "OK",
    ERROR: "ERROR",
    RESET: "RESET"
}
export const CRUD_TYPES = {
    GET: "GET",
    LIST: "LIST",
    REMOVE: "REMOVE",
    UPDATE: "UPDATE",
    ADD: "ADD"
}
class ActionCreator {
    constructor(name, crudType) {
        this.marks = ActionCreator.getActionTypes(name)
        this.crudType = crudType
        this.name = name
        this.creators = {
            request: this.getActionCreator(this.marks.REQUEST),
            ok: this.getActionCreator(this.marks.OK),
            error: this.getActionCreator(this.marks.ERROR),
            reset: this.getActionCreator(this.marks.RESET)
        }
    }
    static getActionTypes(name) {
        return {
            REQUEST: `${name}_${ASYNC_META.REQUEST}`,
            OK: `${name}_${ASYNC_META.OK}`,
            ERROR: `${name}_${ASYNC_META.ERROR}`,
            RESET: `${name}_${ASYNC_META.RESET}`
        }
    }
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
    getActionCreator(type) {
        const {crudType} = this
        return (payload) => {
            // args = args && args.length === 1 ? args[0] : args
            return { type, crudType, payload }
        }
    }
}
