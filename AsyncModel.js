import { bindActionCreators } from 'redux'
import AsyncCrud from './AsyncCrud';
import { connect } from 'react-redux';
const yup = require('yup')

export default class AsyncModel {
    constructor(models) {
        this.models = models
        this.asyncs = {}
        this.reducers = {}
        for (const prop of Object.keys(models)) {
            const model = models[prop]
            const async = new AsyncCrud(prop, model)
            this.asyncs[prop] = async
            this.reducers[prop] = async.createReducer()
            // reducers[f] = async.createReducer()
        }
    }
    findName(model) {
        const meta = model.meta() || {}
        if (meta.name) {
            return meta.name
        }
        for (const prop of Object.keys(this.models)) {
            if (this.models[prop] === model) {
                return prop
            }
        }
        return undefined
    }
    connect(model) {
        const name = this.findName(model) || 'unknown'
        const async = this.asyncs[name]
        const actions = async ? async.createActions() : {}
        const mapDispatchToProps = (dispatch) => {
            return { [`${name}Actions`]: bindActionCreators(actions, dispatch), dispatch }
        }
        const mapStateToProps = (state) => {
            const props = state[name] || { data: [] }
            props.getColumns = Util.getColumns.bind(null, model)
            return {
                [`${name}Data`]: props
            }
        }

        return function (ConnectedComponent) {
            return connect(mapStateToProps, mapDispatchToProps)(ConnectedComponent);
        }
    }
}
class Util {
    static getColumns(model) {
        const schemas = model.fields
        return Object.keys(schemas).map(field => {
            // const fieldSchema = schemas[field]
            const {meta, label, type} = schemas[field].describe()
            const gridProps = schemas[field].grid()
            // const label = fieldSchema._label 
            const col = {
                dataKey: field,
                label: label ? label : Util.normalize(field), 
                dataType: type
            }
            return Object.assign(col, gridProps)
        })
    }
    static normalize(name) {
        if (!name || name.length === 0)
            return ''
        name = name.replace(/[A-Z]/, ' $&')
        return name.charAt(0).toUpperCase() + name.substr(l)
    }
    static addYupMethod(method, defaultValue = {}) {
        const field = `_${method}`
        yup.addMethod(yup.mixed, method, function (props) {
            if (props === undefined) {
                return this[field] || defaultValue
            }
            const next = this.clone()
            next[field] = props
            return next
        })
    }
    // static addIsKeyMethod() {
    //     const field = '_isKey'
    //     yup.addMethod(yup.mixed, isKey, function (props) {
    //         if (props === undefined) {
    //             return this[field] || false
    //         }
    //         const next = this.clone()
    //         next[field] = props
    //         return next
    //     })
    // }
}
Util.addYupMethod('grid')
Util.addYupMethod('isKey', false)