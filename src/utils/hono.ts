import {Hono, type Context as HonoContext} from "hono"

export type Bindings = Env

export type Context = HonoContext<{Bindings: Bindings}>

export default () => new Hono<{Bindings: Bindings}>()
