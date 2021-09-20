## [Blog Post: Promise.all, but with a timeout for each promise](https://rajrajhans.com/2021/07/promise-all-with-a-timeout/)

This repository contains code used in the [blog post which you can read here](https://rajrajhans.com/2021/07/promise-all-with-a-timeout/).

<hr/>

## The Problem

I was working on a NodeJS code which will act as a proxy server. When a client makes a request to this proxy server, it has to make N more requests to N servers, and return back a collection of the results from each one. I also need to handle the scenario when one of the servers is down. If one server, say X, is down, it should be conveyed to the client that server X is down, along with the responses from remaining N-1 servers.

## Setting up dummy servers for testing

Before going ahead, let's set up some dummy servers to test our approaches. 

```js
// servers.js

const express = require("express");
const app = express();
const ports = [3001, 3002, 3003];

app.get("/", (req, res) => {
  const r = Math.floor(Math.random() * 100);
  res.send(String(r));
});

ports.forEach((port) => {
  app.listen(port, () => {
    console.log(`Sample Server listening at http://localhost:${port}`);
  });
});
```

This simple code sets up three servers on the given ports, and responds to a GET request for a random number.

## Approach 1

First and simplest approach is to have a for loop, in that for loop, I'll make a network call. If it is successful, then I'll append the response to a `results` array. If it fails, then I'll append something that indicates the failure to the `results` array. At the end, I'll send back this `results` array to the client. Here's a simple illustration of this idea.

```js
// aggregator-v1.js

const express = require("express");
const app = express();
const request = require("request-promise"); 
const port = 3000;

// 3001, 3002, 3003 work. but 3420 is invalid.
const servers = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3420",
  "http://localhost:3003",
];

app.get("/", async (req, res) => {
  const results = [];

  for (const serverURL of servers) {
    await request
      .get(serverURL)
      .then((d) => {
        console.log(d);
        results.push(d)
      })
      .catch((e) => {
        results.push(`Server ${serverURL} is down!`);
      });
  }

  res.json(results);
});

app.listen(port, () => {
  console.log(`Aggregator app listening at http://localhost:${port}`);
});
```

### The problem with this approach

This fulfills all the requirements we have. But there is one problem here. We are making these network calls one after the other. That means the total time required would be a **sum of all the times required for each network call**. 

## Approach 2

We can definitely do better and come up with a solution wherein the network calls can run concurrently. In that case, the total time required would be **the time taken by the slowest network call**, as the requests will happen concurrently and thus the request taking the longest will drive the worst-case scenario.

This makes us think of using `Promise.all`, which does exactly what we want. But the issue there is that `Promise.all` is **all or nothing**, meaning that it will reject if any of the input promise rejects (even if others are successful). So if we use Promise.all in the above example, it will always error out (since one server out of the four is down).

A better solution would be something which will use Promise.all to get benefit of having the requests execute concurrently, but also handling the situation when one of the servers might be down. 

We can do this by having a wrapper over the actual network call promise. 

- If the **network call is successful**,
    - then the wrapper should resolve the promise, and return back the data recieved from the network.
- But, if the network call promise either **fails** or **takes longer than x seconds**,
    - then the wrapper should resolve the promise, but with a error text as the resulting value. This can also be used to signify to the client that this particular server is down.

This way, the wrapper makes sure that the promise is always resolved, so Promise.all will also always resolve.

Now how to handle the requirement where "if the network call takes more than x seconds, the wrapper should resolve promise with an error". We have `Promise.race` at our disposal. Using `Promise.race`, we can essentially have a race between two promises and at the end get back whichever promise resolves/rejects first. So we can use that to create sort of a time bomb. First input to `Promist.race` would be the network request's promise, and the second input would be a Promise that has a `setTimeout` inside it of `x` seconds. After x seconds, the `setTimeout` would be set to fire and resolve the Promise with an error. This way, we can achieve our intended behaviour!

Let's take a look at the implementation of the above idea -

```js
// aggregator-v2.js

app.get("/", async (req, res) => {
  let results = [];
  const networkPromises = [];
  let wrappedPromises = [];

  // creating an array of promises of network calls
  for (const serverURL of servers) {
    networkPromises.push(request(serverURL));
  }
  
  // "wrapping" each network promise with a 4 second timer promise 
  wrappedPromises = networkPromises.map((promise) => {
    const waitForSeconds = new Promise((resolve) => {
      setTimeout(() => {
        resolve("Server didn't respond");
      }, 4000);
    });
    
    // basically creating a situation where there'll be a race between them
    const wrapperPromise = Promise.race([promise, waitForSeconds]).catch(
      (err) => {
        // if network promise straightup fails, handle that condition here
        return "server is down";
      }
    );

    return wrapperPromise;
  });

  // executing the wrappedPromises 
  await Promise.all(wrappedPromises)
    .then((data) => {
      results = data;
      console.log(data);
    })

  res.json(results);
});
```

Now, this code will return back the server response when the server is up, and will return "server is down" when the server is down. Since it uses `Promise.all` the network requests happen concurrently, so we don't have to wait for the sum of all network request times. 

Thus, we have satisfied all the requirements we started out with. Thanks for reading!