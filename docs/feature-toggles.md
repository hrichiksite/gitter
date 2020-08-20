# Feature Toggles

Various features on Gitter are hidden behind a feature toggle. It is best to [enable Next](./faq.md#what-is-gitter-next) when using these features.

Some features are experimental and it is best not to just enable everything as they could easily break some things as they are developed.


## Using Gitter in your browser?

Simply visit [next.gitter.im](http://next.gitter.im/) and make sure the big giant Next switch is enabled, then find the left-menu toggle further down the screen and enable it. Refresh Gitter and you should be good to go.

![](https://i.imgur.com/Z4S0KX3.png)


## Windows or Linux App

If you use Gitter on Windows or Linux, it's a little fiddlier than that. Click on the Gitter menu in the top-bar and make sure Gitter Next is enabled. Then click on Developer Tools which will bring up a window and select the Console tab. Find the select box that defaults to <top frame> at the top of the console and change the value to mainframe. Once that's done, paste the following code into the console and press Enter.

```
document.cookie = 'fflip=' + encodeURIComponent('j:' + JSON.stringify({ 'some-feature-toggle': true })) + ';path=/;expires=' + new Date(Date.now() + 31536000000).toUTCString();
location.reload();
```


## Mac App

Make sure Enable Developer Tools is enabled from the Gitter menu in the top bar. Right click anywhere in the application and choose Inspect Element. This will bring up a web console, just paste the following code snippet into the console and press Enter. The app will refresh after a second or so.

```
document.cookie = 'fflip=' + encodeURIComponent('j:' + JSON.stringify({ 'some-feature-toggle': true })) + ';path=/;expires=' + new Date(Date.now() + 31536000000).toUTCString();
location.reload();
```
