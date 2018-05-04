const http = require('http');
const url = require('url');
const qs = require('querystring');
const exec = require('child_process').exec;
const crypto = require('crypto');
//github 的secret
const GITHUB_WEBHOOK_SECRET = 'vo87lf78LGYJFVu6D';


 
http.createServer(function (req, res) {
  req.setEncoding('utf-8');
  var postData = '';
  req.addListener('data', function (postDataChunk) {
    postData += postDataChunk;
    console.log(postData);
  });

  req.addListener('end', function () {
    const params = Object.assign({}, JSON.parse(postData), qs.parse(url.parse(req.url).query));
   
    //验证secret
    const hmac = crypto.createHmac('sha1', GITHUB_WEBHOOK_SECRET);
    const ourSignature = `sha1=${hmac.update(postData).digest('hex')}`;
    const theirSignature = req.get('X-Hub-Signature');

    const bufferA = Buffer.from(ourSignature, 'utf8');
    const bufferB = Buffer.from(theirSignature, 'utf8');

    const safe = crypto.timingSafeEqual(bufferA, bufferB);

    if(!safe)
     {
      console.log('secret not match!')
      return ;
     }
    //自动部署
    const project = params.project.name.toString().trim();
    const branch = params.ref.replace('refs/heads/', '').toString().trim();
    const author = params.user.username.toString().trim();
    const message = params.commits[0].message.toString().trim();
    console.log(`项目${project}的有代码push，提交人：${author}，注释：${message}`);


 
      let cmd = `cd /srv/${project} && git pull &&`;
      cmd += 'yarn && yarn doc && yarn build-test && pm2 startOrReload pm2.json';
      console.log('cmd: ', cmd);
      exec(cmd, function (error, stdout, stderr) {
        console.log('error =>', error);
        console.log('stdout =>', stdout);
        console.log('stderr =>', stderr);
      });

    res.writeHead(200, {'Content-Type': 'text-plain'});
    res.end('ok');
  });

}).listen(6666, '127.0.0.1');

console.log('start server');