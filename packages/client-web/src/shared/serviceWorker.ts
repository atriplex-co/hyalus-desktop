const _self = self as unknown as ServiceWorkerGlobalScope;

_self.addEventListener("fetch", () => {
  //
});

_self.addEventListener("push", async (e: PushEvent) => {
  const data = e.data?.json() as {
    t: number;
    d: unknown;
    p: number;
    e: unknown;
  };

  console.log(data);
});
