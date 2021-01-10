# Enchant Puppeteer

Charm the mighty [Puppeteer](https://github.com/puppeteer/puppeteer) into supporting multiple, cooperative request
intercept handlers. No more `Request is already handled!` errors.

Compatible with Puppeteer 3.x or greater.

## Installation

```
npm i enchant-puppeteer
```

## Basic Usage

Call `enchantPuppeteer()` at initialization. Puppeteer will become enchanted.

Enchanted Puppeteer will allow all handlers to call `abort()`, `respond()` and `continue()`, and will even await async handlers.

After all handlers have finished, Enchanted Puppeteer will decide whether to `abort`, `respond`, or `continue` according to these rules:

1. If any handler called `abort()`, the request will be aborted.
2. If no handler called `abort()`, but any handler called `respond()`, the request will be responded.
3. If no handler called `abort()` or `respond()`, the request will be continued. `continue()` is called by default, you do not need to call it explicitly.

```typescript
const puppeteer = require('puppeteer');
const { enchantPuppeteer } = require('enchant-puppeteer')

(async () => {
  // First, we must enchant the Puppeteer module. By default, it enchants ./node_modules/puppeteer
  enchantPuppeteer()

  // Magic! Create a browser and page just like normal!
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
    req.abort() // Note: this now returns a resolved promise. It never throws.
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
    req.respond({...req.respondForRequest})
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
    // This is only necessary if you want to modify something.
    // Otherwise, it is done for you.
    req.continue({...req.continueRequestOverrides})
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

Enchanted Puppeteer will wait for your asynchronous intercept handler to finish before deciding what to do
with the request.

```typescript
/**
 * Pupeteer will pause request fulfillment until this and all handlers (async or not)
 * have been completed.
 */
page.on('request', async (req) => {
  // do something async like a database lookup
  const cachedPage = await db.find(req.url());
  if (cachedPage) {
    request.respond(cachedPage); // Respond with the cached page, if available
  }
});

```

### Enchanting a non-standard Puppeteer module path

Occasionally, you may find that the Puppeteer module you need to enchant is not in `./node_modules/puppeteer`. This could happen with
Yarn workspaces or any situation where you're running multiple versions of Puppeteer dependencies.

In that case, give `enchantPuppeteer` the exact path to the module you want to enchant:

```typescript
enchantPuppeteer({ modulePath: '/path/to/module/puppeteer'} )
```

You can enchat multiple Puppeteer modules as well.

## Why does this exist?

Since its release, Puppeteer has expected only ONE intercept handler to call `abort()`, `respond()`, or `continue()`. This really throws a wrench in any attempt to write plugins or multiple intercept handlers that separate concerns.

If a second handler attempts to call the above functions, the dreaded `Request is already handled!` exception will be thrown.

Moreover, Puppeteer exepcts request handlers to be synchronous. This precludes any possibility of asynchronous operations in handlers.
