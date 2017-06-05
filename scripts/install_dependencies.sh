sudo npm install -g @angular/cli
sudo npm install -g pm2
cd /home/ec2-user/sportsapp/api
sudo npm install
sudo pm2 delete all
sudo pm2 start server.js