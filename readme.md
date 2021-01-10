# Enchant Puppeteer

This package charms mighty [Puppeteer](https://github.com/puppeteer/puppeteer) into supporting multiple, cooperative request
interceptions.

Compatible with Puppeteer 3.x or greater.

## What does it do?

It solves a long-standing Puppeteer issue where multiple request intercept handlers would not work together because the first
one to call `abort()`, `respond()`, or `continue()` would prevent all the others from responding.

Cooperative means that Puppeteer will allow multiple request intercept handlers to play nicely together by execututing each and
allowing each handler to call `abort()`, `respond()`, or `continue()`. After all handlers have run, including asynchronous handlers,
Enchant Puppeteer will decide how to finalize the request interception:

1. If any handler called `abort()`, the request will be aborted.
2. If any handler called `respond()`, the a response will be sent.
3. If no handler called `respond()` or `abort()`, the request will `continue()`'d.

## Installation

```
npm i enchant-puppeteer
```

## Basic Request Interception Usage

This example shows how `abort()`, `continue()`, and `respond()` are used cooperatively. This way, different
concerns can be listening to `page.on('request', ...)` and cooperatively handle what to do.

```typescript
const puppeteer = require('puppeteer');
const { enchantPuppeteer } = require('enchant-puppeteer')

(async () => {
  enchantPuppeteer()
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // This is required, otherwise the below operations will throw an exception.
  await page.setRequestInterception(true)

  /**
   * This handler will 'win' because it asks for an abort(). The request will
   * be aborted no matter what any other handler says. All handlers will still
   * execute though.
   */
  page.on('request', req=> {
    req.abort() // Note: this now returns an resolved promise. It never throws.
  });

  /**
   *  As long as no handler calls abort(), a respond() wins over a continue().
   * All handlers will still execute, but the request will be respond()'d even
   * if another handler calls continue().
   *
   * Since another handler may have already called respond(), it's a good idea
   * to check the current interception response and modify accordingly.
   */
  page.on('request', req=> {
    req.respond({...req.respondForRequest, ...}) // This no longer returns a promise
  });

  /**
   * This is the lowest priority. The request will be continued only if no
   * abort() or respond(), but this handler will always run. It just might not
   * win.
   *
   * Since another handler might have also called continue(), it's a good idea
   * to check the current continuation and modify accordingly.
   *
   * Note that there is an implicit continue() is executed by default. Therefore,
   * you only need to call continue() yourself if you intend to modify the request.
   */
  page.on('request', req=> {
    req.continue({...req.continueRequestOverrides}) // This is not necessary, it is done for you.
  });

  await page.goto('https://example.com');
  await page.screenshot({path: 'example.png'});

  await browser.close();
})();
```

## Options

`enchantPuppeteer({...options})` as follows:

| Name       | Meaning                                      | Allowed Values                      | Default                    |
| ---------- | -------------------------------------------- | ----------------------------------- | -------------------------- |
| modulePath | Path to the Puppeteer module to be enchanted | any valid Puppeteer module path     | `./node_modules/puppeteer` |
| logLevel   | Logging level                                | `info`, `debug`, `error`, or `none` | `none`                     |

## Advanced Usage

### Async Intercept Handlers

You may often have a need to perform async operations in during the request interception. Puppeteer
automatically pauses request resolution until all handlers complete. This now includes
waiting for all async request handler operations to resolve.

```typescript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // This is required, otherwise the below operations will throw an exception.
  await page.setRequestInterception(true);

  /**
   * Async example. Pupeteer will not fulfill the request until this and all deferred operations
   * has been completed.
   */
  page.on('request', (req) => {
    req.defer(async () => {
      // do something async like a database lookup
      const cachedPage = await db.find(req.url());
      if (cachedPage) {
        request.respond(cachedPage); // Respond with the cached page, if available
      }
    });
  });

  await page.goto('https://example.com');
  await page.screenshot({ path: 'example.png' });

  await browser.close();
})();
```

### Enchanting a non-standard Puppeteer module path

Occasionally, you may find that the Puppeteer module you need to enchant is not in `./node_modules/puppeteer`. This could happen with
Yarn workspaces or any situation where you're running multiple versions of Puppeteer dependencies.

In that case, give `enchantPuppeteer` the exact path to the module you want to enchant:

```typescript
enchantPuppeteer({ modulePath: '/path/to/module/puppeteer'} )
```

You can enchat multiple Puppeteer modules as well.

### Debugging

```typescript
// info
// error (default)
// debug
// none
enchantPuppeteer({ logLevel: 'info' })
```
