/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  cacheComponents: true,
  experimental: {
    multiZoneDraftMode: true,
    appNavFailHandling: true,
    prerenderEarlyExit: true,
    appDocumentPreloading: true,
    preloadEntriesOnStart: true,
    clientRouterFilter: true,
    clientRouterFilterRedirects: true,
    imgOptSequentialRead: true,
    optimisticClientCache: true,
    // DataCloneError
    workerThreads: false,
    optimizeCss: true,
    nextScriptWorkers: true,
    scrollRestoration: true,
    externalDir: true,
    /**
     * Optimize React APIs for server builds.
     */
    optimizeServerReact: true,
    /**
     * Runs the compilations for server and edge in parallel instead of in serial.
     * This will make builds faster if there is enough server and edge functions
     * in the application at the cost of more memory.
     *
     * NOTE: This option is only valid when the build process can use workers. See
     * the documentation for `webpackBuildWorker` for more details.
     */
    parallelServerCompiles: true,
    /**
     * Runs the logic to collect build traces for the server routes in parallel
     * with other work during the compilation. This will increase the speed of
     * the build at the cost of more memory. This option may incur some additional
     * work compared to if the option was disabled since the work is started
     * before data from the client compilation is available to potentially reduce
     * the amount of code that needs to be traced. Despite that, this may still
     * result in faster builds for some applications.
     *
     * Valid values are:
     * - `true`: Collect the server build traces in parallel.
     * - `false`: Do not collect the server build traces in parallel.
     * - `undefined`: Collect server build traces in parallel only in the `experimental-compile` mode.
     *
     * NOTE: This option is only valid when the build process can use workers. See
     * the documentation for `webpackBuildWorker` for more details.
     */
    parallelServerBuildTraces: true,
    /**
     * Run the Webpack build in a separate process to optimize memory usage during build.
     * Valid values are:
     * - `false`: Disable the Webpack build worker
     * - `true`: Enable the Webpack build worker
     * - `undefined`: Enable the Webpack build worker only if the webpack config is not customized
     */
    webpackBuildWorker: true,
    /**
     * Enables optimizations to reduce memory usage in Webpack. This reduces the max size of the heap
     * but may increase compile times slightly.
     * Valid values are:
     * - `false`: Disable Webpack memory optimizations (default).
     * - `true`: Enables Webpack memory optimizations.
     */
    webpackMemoryOptimizations: true,
    /**
     * Enables experimental taint APIs in React.
     * Using this feature will enable the `react@experimental` for the `app` directory.
     */
    taint: true,
    /**
     * enables the minification of server code.
     */
    serverMinification: true,
    /**
     * Enables source maps generation for the server production bundle.
     */
    serverSourceMaps: true,
    /**
     * Use lightningcss instead of postcss-loader
     */
    useLightningcss: false,
    /**
     * Enables early import feature for app router modules
     */
    useEarlyImport: true,
    /**
     * Enables `fetch` requests to be proxied to the experimental test proxy server
     */
    testProxy: true,
    /**
     * Enable experimental React compiler optimization.
     * Configuration accepts partial config object to the compiler, if provided
     * compiler will be enabled.
     */
    reactCompiler: true,
    /**
     * Allows previously fetched data to be re-used when editing server components.
     */
    serverComponentsHmrCache: true,
    /**
     * When enabled will cause IO in App Router to be excluded from prerenders
     * unless explicitly cached.
     */
    dynamicIO: true,
    /**
     * This config allows you to enable the experimental navigation API `forbidden` and `unauthorized`.
     */
    authInterrupts: true,
    /**
     * Render <style> tags inline in the HTML for imported CSS assets.
     * Supports app-router in production mode only.
     */
    inlineCss: true,

    //clientSegmentCache: true,

    nodeMiddleware: false,

    viewTransition: true,
  },
};

export default nextConfig;
