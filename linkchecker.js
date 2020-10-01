const fs = require("fs");
const path = require("path");
const parse = require("parse-markdown-links");
const cliProgress = require("cli-progress");
const linkCheck = require("link-check");

let totalLinks = [],
  filePaths = [],
  brokenLinks = [];
let callcount = 0,
  executedLinks = 0;

// #inputSection please change all input variables here
/*-----------------------------------------------*/
let directoryPath = "./dir"; // chnage directory path
let tokenUrl = "?allowlogin=1&token=dbf0226b-121a-4840-a4fc-b6eb75cb72f6"; // token url for login
let showEachFileDetails = false; // show/hide each file link details
/*-----------------------------------------------*/

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// To get files from directory and subdirectory
const navigate = (dir, callback) => {
  callcount++;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) navigate(dirPath, callback);
    else filePaths.push(dirPath);
  });
  callcount--;
  if (callcount === 0) callback(filePaths);
};

// Check each link status
const getAllLinksStatus = links => {
  console.debug("Total Links Found : ", links.length);
  bar1.start(links.length, 0);
  try {
    Promise.all(
      links.map(url => {
        linkCheck(url.split("-----")[1], function(err, res) {
          executedLinks++;
          bar1.update(executedLinks);

          if (res.status === "dead") brokenLinks.push(url);

          if (executedLinks === links.length) {
            bar1.stop();
            console.debug("\n\n---------------Dead Links-------------------");
            console.debug(
              brokenLinks.length
                ? brokenLinks
                : "Good News : No dead links found"
            );
          }

          if (err) {
            console.error(err);
            return;
          }
        });
      })
    ).catch(e => {
      console.debug("something went wrong while fetching link: ", e.message);
    });
  } catch (e) {
    console.debug(
      "something went wrong in try and we caught in catch block: ",
      e.message
    );
  }
};

// maintain file content and links
try {
  navigate(directoryPath, filePaths => {
    console.debug("Total Files : ", filePaths.length);
    filePaths.forEach(filePath => {
      const fileContents = fs.readFileSync(filePath, "utf8");
      let links = [];
      try {
        links = parse(fileContents.replace(/ (.*?)\n|\t/g, ""));
      } catch (e) {
        console.debug("Error found in this file " + filePath);
        console.debug(e.message);
      }
      if (showEachFileDetails) {
        console.debug("File Name :", filePath);
        console.debug("Total Links Found :", links.length);
      }
      totalLinks = [
        ...totalLinks,
        ...links.map(e => {
          if (!e.startsWith("http"))
            e = "https://docs.loginradius.com" + e + tokenUrl;
          return filePath + "-----" + e;
        })
      ];
    });
    getAllLinksStatus(totalLinks);
  });
} catch (e) {
  if (e.message.includes("ENOENT: no such file or directory"))
    console.debug(
      "\x1b[33m PLEASE CHANGE THE INPUT VALUES.  \x1b[0m \nyou can find \x1b[32m \x1b[5m #inputSection \x1b[0m inside file"
    );
  else console.debug(e.message);
}
