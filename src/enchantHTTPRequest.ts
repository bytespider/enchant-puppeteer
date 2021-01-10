import Protocol from 'devtools-protocol'
import { Request } from 'puppeteer'
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection'
import { EventEmitter } from 'puppeteer/lib/cjs/puppeteer/common/EventEmitter'
import { Frame } from 'puppeteer/lib/cjs/puppeteer/common/FrameManager'
import { debugError } from 'puppeteer/lib/cjs/puppeteer/common/helper'
import { HTTPRequest } from 'puppeteer/lib/cjs/puppeteer/common/HTTPRequest'
import { Handler } from 'puppeteer/lib/cjs/vendor/mitt/src'
import { interceptedHTTPRequests } from '.'
import { findModule } from './findModule'

export type DeferredRequestHandler = () => PromiseLike<void>

declare module 'puppeteer' {
  interface Request {
    isEnchanted: boolean
    continueRequestOverrides?: Overrides
    responseForRequest?: RespondOptions
    abortErrorCode?: ErrorCode
    shouldContinue: boolean
    shouldRespond: boolean
    shouldAbort: boolean
    onInterceptFinalized: (fn: Handler) => EventEmitter
    onInterceptAborted: (fn: Handler) => EventEmitter
    onInterceptResponded: (fn: Handler) => EventEmitter
    onInterceptContinued: (fn: Handler) => EventEmitter
    finalizeInterception(): Promise<void>
    defer(fn: DeferredRequestHandler): void
  }
}

export type EnchantedHTTPRequest = Request & {
  deferredRequestHandlers: DeferredRequestHandler[]
  _finalizeEmitter: EventEmitter
}

export const RequestInterceptionOutcome = {
  Aborted: 'aborted',
  Continued: 'continued',
  Responded: 'responded',
  Finalized: 'finalized',
} as const

export const enchantHTTPRequest = (modulePath: string) => {
  const HTTPRequestModule = findModule(modulePath, 'HTTPRequest')
  const oldKlass = HTTPRequestModule.HTTPRequest as typeof HTTPRequest

  const klass = function (
    client: CDPSession,
    frame: Frame,
    interceptionId: string,
    allowInterception: boolean,
    event: Protocol.Network.RequestWillBeSentEvent,
    redirectChain: HTTPRequest[]
  ) {
    const obj = (new oldKlass(
      client,
      frame,
      interceptionId,
      allowInterception,
      event,
      redirectChain
    ) as unknown) as EnchantedHTTPRequest

    obj.isEnchanted = true
    obj.shouldContinue = true // Continue by default
    obj.shouldRespond = false
    obj.shouldAbort = false
    obj._finalizeEmitter = new EventEmitter()
    obj.deferredRequestHandlers = []
    interceptedHTTPRequests[interceptionId] = obj

    obj.defer = function (fn) {
      this.deferredRequestHandlers.push(fn)
    }

    obj.onInterceptFinalized = function (cb) {
      return this._finalizeEmitter.on(RequestInterceptionOutcome.Finalized, cb)
    }
    obj.onInterceptAborted = function (cb) {
      return this._finalizeEmitter.on(RequestInterceptionOutcome.Aborted, cb)
    }
    obj.onInterceptContinued = function (cb) {
      return this._finalizeEmitter.on(RequestInterceptionOutcome.Continued, cb)
    }
    obj.onInterceptResponded = function (cb) {
      return this._finalizeEmitter.on(RequestInterceptionOutcome.Responded, cb)
    }

    const oldContinue = oldKlass.prototype.continue

    obj.continue = async function (overrides) {
      this.continueRequestOverrides = overrides
      this.shouldContinue = true
    }

    const oldRespond = oldKlass.prototype.respond
    obj.respond = async function (response) {
      this.responseForRequest = response
      this.shouldRespond = true
    }

    const oldAbort = oldKlass.prototype.abort
    obj.abort = async function (errorCode) {
      this.shouldAbort = true
      this.abortErrorCode = errorCode
    }

    obj.finalizeInterception = async function () {
      return Promise.all(this.deferredRequestHandlers.map((fn) => fn()))
        .then(() => {
          if (this.shouldAbort) {
            return oldAbort
              .bind(this)(this.abortErrorCode)
              .then(() => {
                this._finalizeEmitter.emit(RequestInterceptionOutcome.Aborted)
                this._finalizeEmitter.emit(RequestInterceptionOutcome.Finalized)
              })
              .catch((e) => {
                console.error(e)
              })
          }
          if (this.shouldRespond)
            return (
              oldRespond
                //@ts-ignore This is okay to have undefined fields, the puppeteer core typing is incorrect
                .bind(this)(this.responseForRequest)
                .then(() => {
                  this._finalizeEmitter.emit(
                    RequestInterceptionOutcome.Responded
                  )
                  this._finalizeEmitter.emit(
                    RequestInterceptionOutcome.Finalized
                  )
                })
                .catch((e) => {
                  console.error(e)
                })
            )
          return oldContinue
            .bind(this)(this.continueRequestOverrides)
            .then(() => {
              this._finalizeEmitter.emit(RequestInterceptionOutcome.Continued)
              this._finalizeEmitter.emit(RequestInterceptionOutcome.Finalized)
            })
            .catch((e) => {
              console.error(e)
            })
        })
        .catch((error) => {
          console.error(error)

          debugError(error)
        })
    }
    return obj
  }

  HTTPRequestModule.HTTPRequest = klass
}
