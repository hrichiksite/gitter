```html
<html>
  <head>
    <link rel="stylesheet" href="assets/dashboard.css">
    <link rel="stylesheet" href="assets/octicons.css">
    <link href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css" rel="stylesheet">
    <script src="//use.typekit.net/rfa7cdy.js"></script>
    <script>try{Typekit.load();}catch(e){}</script>
  </head>
  <!-- <body class="tk-freight-sans-pro .tk-source-sans-pro"> -->
  <body class="tk-source-sans-pro unread">
    <div class="menu-bar" id="menu-bar">
       <section class="menu-toggles">
        <div class="menu-bar-item"><i class="fa fa-lg fa-users selected" id="icon-contacts"></i><div class="unread-counter">23</div></div>
        <div class="menu-bar-item"><i class="fa fa-lg fa-search" id="icon-search"></i></div>
        <div class="menu-bar-item"><i class="fa fa-lg fa-plus" id="icon-new-room"></i></div>
        <div class="menu-bar-item"><div class="avatar semi greyscale gitterHQ" id="icon-org-rooms"></div></div>
      </section>
      <section class="menu-pages">
        <div class="menu-bar-item"><i class="fa fa-lg mydigitalself"></i></div>
        <div class="menu-bar-item"><i class="fa fa-lg fa-home"></i><div class="unread-counter home" id="home-counter">7</div></div>
        <div class="menu-bar-item"><i class="fa fa-lg fa-globe"></i></div>
        <div class="menu-bar-item"><i class="fa fa-lg fa-cog"></i></div>
        <div class="menu-bar-item"><i class="fa fa-lg fa-question"></i></div>
      </section>
    </div>
    <div class="left-column pinned" id="left-menu">
      <section class="contacts-menu js-left-panel left-panel-item" id="contacts-panel">
        <h2>All conversations</h2>
        <ul>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>gitterHQ</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>gitterHQ/gitter</span>
          </li>
          <li>
            <i class="avatar andrew"></i>
            <span>Andrew Newdigate</span>
          </li>
          <li>
            <i class="avatar mauro"></i>
            <span>Mauro Pompilio</span>
          </li>
          <li>
            <i class="avatar andy"></i>
            <span>Andy Trevorah</span>
          </li>
          <li>
            <i class="avatar mydigitalself"></i>
            <span>mydigitalself/thoughts</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>gitterHQ</span>
          </li>
          <li>
            <i class="avatar rails"></i>
            <span>rails/rails</span>
          </li>
          <a href="index.html">
            <li>
              <i class="avatar iojs"></i>
                <span>ios/io.js</span>
              </li>
          </a>
          <li>
            <i class="avatar oli"></i>
            <span>Oli Evans</span>
          </li>
          <li>
            <i class="avatar sam"></i>
            <span>Sam Saconne</span>
          </li>
        </ul>
        <br>
        <h2>Suggested rooms</h2>
        <ul>
          <li>
            <i class="avatar iojs"></i>
            <span>ios/io.js</span>
          </li>
        </ul>
        <br>
        <div class="tip">
          <b>Tip of the day</b><br>
          Gitter is available as a Mac app.
          <br>Click here to download.
        </div>
      </section>
      <section class="search js-left-panel left-panel-item" id="search-panel">
        <input type="search" placeholder="Search" autofocus></input>
        <br>
        <div class="tip">
          <b>Did you know? </b><br>
          You can search for people, rooms or chat messages here.
        </div>
        <br>
        <h2>Recent Searches</h2>
        <p><a href="#">gitt</a></p>
        <p><a href="#">andr</a></p>
        <p><a href="#">phone number</a></p>
        <p><a href="#">badger</a></p>
      </section>
      <section class="new js-left-panel left-panel-item" id="new-room-panel">
        <h1>Create a room</h1>
        <section class="name">
          <h2>Pick a name</h2>
            <section class="name-picker">
              <div class="avatar midi gitterHQ middle"></div><input class="middle" type="text"></input>
            </section>
          <br><br>
          <h2>Permissions</h2>
          <section class="permission-buttons">
            <div class="permission-button selected"><i class="fa fa-users"></i>GitterHQ members</div>
            <div class="permission-button"><i class="fa fa-globe"></i>Public</div>
            <div class="permission-button"><i class="fa fa-lock"></i>Invite only</div>
          </section>
        </section>
      </section>
      <section class="org-room-menu js-left-panel left-panel-item" id="org-room-panel">
        <h2>GitterHQ rooms</h2>
        <ul>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>gitterHQ</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>devops</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>london</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>cat gifs</span>
          </li>
        </ul>
        <br>
        <h2>Public Rooms</h2>
        <ul>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>gitter</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>developers</span>
          </li>
          <li>
            <i class="avatar gitterHQ"></i>
            <span>desktop</span>
          </li>
        </ul>
      </section>
    </div>
    <div class="main-column" id="main-content">
      <div class="chat-content-container dashboard main-column-item" id="chat-content-container">
        <div class="room-title">Welcome home</div>
        <div class="" id="masonry-container">
          <div class="dashboard-item">
            <h2>Messages</h2>
            <ul>
              <li><div class="mention badge">@</div>gitterHQ/gitter</li>
              <li><div class="mention badge">@</div>marionettejs/backbone.marionette</li>
              <li><div class="unread badge">12</div>iojs/io.js</li>
              <li><div class="unread badge">4</div>suprememoocow</li>
            </ul>
          </div>
          <div class="dashboard-item">
            <h2>Github Issues</h2>
            <div class="issue-widget">
              <table>
                <tr>
                  <td class="counter yours"><h1>6</h1></td>
                  <td class="counter org"><h1>638</h1></td>
                  <td class="counter"><canvas id="micro-line" width="200" height="50"></canvas></td>
                </tr>
                <tr>
                  <td><small>Yours</small></td>
                  <td><small>gitterHQ</small></td>
                  <td><small>6 months</small></td>
              </table>
            </div>
            <h2>Since yesterday</h2>
            <div class="issue-item unread">
              <i class="avatar gitterHQ"></i>7 new issues
            </div>
            <div class="issue-item unread">
              <i class="avatar iojs"></i>43 new issues
            </div>
            <div class="issue-item unread">
              <i class="avatar mydigitalself"></i>Assigned 1 new issue
            </div>
            <div class="issue-item unread">
              <span class="octicon octicon-comment"></span>Comments in 4 issues
            </div>
          </div>

          <div class="dashboard-item green">
            <h2>Jenkins all builds passing</h2>
          </div>

          <div class="dashboard-item">
            <h2>Sentry</h2>
            <div id="chart" class="chart" data-api-url="/api/0/projects/gitter/gitterim-backend/stats/" data-days="1" style="height: 50px;">
                    <div class="sparkline" style="height: 50px;"><a style="width:4.16%;" rel="tooltip" title="" data-original-title="78 events<br>(a day ago)"><span style="height:20.64%">78</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="100 events<br>(a day ago)"><span style="height:26.47%">100</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="73 events<br>(21 hours ago)"><span style="height:19.32%">73</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="374 events<br>(20 hours ago)"><span style="height:99%">374</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="154 events<br>(19 hours ago)"><span style="height:40.76%">154</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="235 events<br>(18 hours ago)"><span style="height:62.2%">235</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="159 events<br>(17 hours ago)"><span style="height:42.08%">159</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="75 events<br>(16 hours ago)"><span style="height:19.85%">75</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="47 events<br>(15 hours ago)"><span style="height:12.44%">47</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="66 events<br>(14 hours ago)"><span style="height:17.47%">66</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="192 events<br>(13 hours ago)"><span style="height:50.82%">192</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="1 events<br>(12 hours ago)"><span style="height:0.26%">1</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="0 events<br>(11 hours ago)"><span style="height:0%">0</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="2 events<br>(10 hours ago)"><span style="height:0.52%">2</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="0 events<br>(9 hours ago)"><span style="height:0%">0</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="55 events<br>(8 hours ago)"><span style="height:14.55%">55</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="99 events<br>(7 hours ago)"><span style="height:26.2%">99</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="0 events<br>(6 hours ago)"><span style="height:0%">0</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="1 events<br>(5 hours ago)"><span style="height:0.26%">1</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="0 events<br>(4 hours ago)"><span style="height:0%">0</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="1 events<br>(3 hours ago)"><span style="height:0.26%">1</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="4 events<br>(2 hours ago)"><span style="height:1.05%">4</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="25 events<br>(an hour ago)"><span style="height:6.61%">25</span></a><a style="width:4.16%;" rel="tooltip" title="" data-original-title="1 events<br>(26 minutes ago)"><span style="height:0.26%">1</span></a></div>
                </div>
          </div>

          <div class="dashboard-item red">
            <h2>Pagerduty 11 triggered incidents</h2>
          </div>

          <div class="dashboard-item">
            <h2>Code changes</h2>
            <table>
              <tr>
                <td></td>
                <td>F</td>
                <td>S</td>
                <td>S</td>
                <td>M</td>
                <td>T</td>
                <td><strong>W</strong></td>
                <td class="disabled">T</td>
                <td class="disabled">F</td>
              </tr>
              <tr>
                <td class="person"><i class="avatar mydigitalself"></i></td>
                <td><i class="spark dark"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark light"></i></td>
                <td><i class="spark medium"></i></td>
                <td><i class="spark none"></i></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td class="person"><i class="avatar mauro"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark medium"></i></td>
                <td><i class="spark dark"></i></td>
                <td><i class="spark light"></i></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td class="person"><i class="avatar andy"></i></td>
                <td><i class="spark dark"></i></td>
                <td><i class="spark light"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark medium"></i></td>
                <td><i class="spark medium"></i></td>
                <td><i class="spark light"></i></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td class="person"><i class="avatar andrew"></i></td>
                <td><i class="spark dark"></i></td>
                <td><i class="spark medium"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark none"></i></td>
                <td><i class="spark dark"></i></td>
                <td><i class="spark none"></i></td>
                <td></td>
                <td></td>
              </tr>
            </table>
            <br>
            <h2>Recent changes</h2>
            <div class="issue-item unread">
              <i class="avatar andy"></i>replaced /roster with /users?limit=25
            </div>
            <div class="issue-item unread">
              <i class="avatar andy"></i>fixed typahead crash for not logged in users
            </div>
            <div class="issue-item unread">
              <i class="avatar mydigitalself"></i>fix for avatar CDN stuff
            </div>
            <div class="issue-item">
              <i class="avatar andrew"></i>Update for break in gitter-realtime-client
            </div>
          </div>

          <div class="dashboard-item">
            <h2>Codacy</h2>
            <div class="codacy-item">
              gitterHQ/gitter
              <div class="codacy-badge grade-a">A</div>
            </div>
            <div class="codacy-item">
              gitterHQ/desktop
              <div class="codacy-badge grade-b">B</div>
            </div>
            <div class="codacy-item">
              gitterHQ/gitter-realtime-client
              <div class="codacy-badge grade-a">A</div>
            </div>
            <div class="codacy-item">
              gitterHQ/dugout
              <div class="codacy-badge grade-c">C</div>
            </div>
          </div>

        </div> <!-- end masonry container -->

      </div> <!-- end chat content -->

    </div>
    <script src="js/masonry.js"></script>
    <script src="js/chart.js"></script>
    <script src="js/jquery-1.10.2.js"></script>
    <script src="js/app.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/jquery-visible.js"></script>


  </body>
</html>

```
