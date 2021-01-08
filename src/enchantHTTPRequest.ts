import Protocol from 'devtools-protocol'
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection'
import { EventEmitter } from 'puppeteer/lib/cjs/puppeteer/common/EventEmitter'
import { Frame } from 'puppeteer/lib/cjs/puppeteer/common/FrameManager'
import { debugError } from 'puppeteer/lib/cjs/puppeteer/common/helper'
import {
  ContinueRequestOverrides,
  ErrorCode,
  HTTPRequest,
  ResponseForRequest,
} from 'puppeteer/lib/cjs/puppeteer/common/HTTPRequest'
import { Handler } from 'puppeteer/lib/cjs/vendor/mitt/src'
import { interceptedHTTPRequests } from '.'

export type DeferredRequestHandler = () => PromiseLike<void>

export type EnchantedHTTPRequest = HTTPRequest & {
  isEnchanted: boolean
  continueRequestOverrides?: ContinueRequestOverrides
  responseForRequest?: ResponseForRequest
  abortErrorCode?: ErrorCode
  shouldContinue: boolean
  shouldRespond: boolean
  shouldAbort: boolean
  deferredRequestHandlers: DeferredRequestHandler[]
  finalizeInterception(): Promise<void>
  defer(fn: DeferredRequestHandler): void
  _finalizeEmitter: EventEmitter
  onInterceptFinalized: (fn: Handler) => EventEmitter
  onInterceptAborted: (fn: Handler) => EventEmitter
  onInterceptResponded: (fn: Handler) => EventEmitter
  onInterceptContinued: (fn: Handler) => EventEmitter
}

export const RequestInterceptionOutcome = {
  Aborted: 'aborted',
  Continued: 'continued',
  Responded: 'responded',
  Finalized: 'finalized',
} as const

export const enchantHTTPRequest = (klass: typeof HTTPRequest) => {
  const construct = klass.prototype.constructor
  klass.prototype.constructor = (
    client: CDPSession,
    frame: Frame,
    interceptionId: string,
    allowInterception: boolean,
    event: Protocol.Network.RequestWillBeSentEvent,
    redirectChain: HTTPRequest[]
  ): HTTPRequest => {
    const obj: EnchantedHTTPRequest = construct(
      client,
      frame,
      interceptionId,
      allowInterception,
      event,
      redirectChain
    )
    obj.isEnchanted = true
    obj.shouldContinue = true // Continue by default
    obj.shouldRespond = false
    obj.shouldAbort = false
    obj._finalizeEmitter = new EventEmitter()
    obj.onInterceptFinalized = (cb) => {
      return obj._finalizeEmitter.on(RequestInterceptionOutcome.Finalized, cb)
    }
    obj.onInterceptAborted = (cb) => {
      return obj._finalizeEmitter.on(RequestInterceptionOutcome.Aborted, cb)
    }
    obj.onInterceptContinued = (cb) => {
      return obj._finalizeEmitter.on(RequestInterceptionOutcome.Continued, cb)
    }
    obj.onInterceptResponded = (cb) => {
      return obj._finalizeEmitter.on(RequestInterceptionOutcome.Responded, cb)
    }

    interceptedHTTPRequests[interceptionId] = obj
    return obj
  }

  const p = klass.prototype as EnchantedHTTPRequest

  /**
   * @returns Adds an async (deferred) request handler to the processing queue.
   * Deferred handlers are not guaranteed to execute in any particular order,
   * but they are guarnateed to execute before returning control to Chromium.
   */
  p.defer = function (fn) {
    this.deferredRequestHandlers.push(fn)
  }

  const compatibility = Promise.reject(
    `Do not await this promise. Use onInterceptFinalized(), onInterceptAborted(), onInterceptResponded(), or onInterceptContinued() listeners instead.`
  )

  const oldContinue = p.continue
  p.continue = async function (overrides) {
    this.continueRequestOverrides = overrides
    this.shouldContinue = true
    return compatibility
  }

  const oldRespond = p.respond
  p.respond = async function (response) {
    this.responseForRequest = response
    this.shouldRespond = true
    return compatibility
  }

  const oldAbort = p.abort
  p.abort = async function (errorCode) {
    this.shouldAbort = true
    this.abortErrorCode = errorCode
    return compatibility
  }

  p.finalizeInterception = async function () {
    return Promise.all(this.deferredRequestHandlers.map((fn) => fn()))
      .then(() => {
        if (this.shouldAbort) {
          return oldAbort
            .bind(this)(this.abortErrorCode)
            .then(() => {
              this._finalizeEmitter.emit(RequestInterceptionOutcome.Aborted)
              this._finalizeEmitter.emit(RequestInterceptionOutcome.Finalized)
            })
        }
        if (this.shouldRespond)
          return oldRespond
            .bind(this)(this.responseForRequest!)
            .then(() => {
              this._finalizeEmitter.emit(RequestInterceptionOutcome.Responded)
              this._finalizeEmitter.emit(RequestInterceptionOutcome.Finalized)
            })
        return oldContinue
          .bind(this)(this.continueRequestOverrides)
          .then(() => {
            this._finalizeEmitter.emit(RequestInterceptionOutcome.Continued)
            this._finalizeEmitter.emit(RequestInterceptionOutcome.Finalized)
          })
      })
      .catch((error) => {
        debugError(error)
      })
  }

  return klass
}
