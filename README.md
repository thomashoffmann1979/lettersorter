# sorter

This program is the sorter client and sorter dispatcher for letter sorter machines. The dispatcher receives sorting informations from an erp or an ocr service.
Every sorter client searches for a dispatcher on the same network. If found it connects to them. If the dispatcher receives and container id for the client, the client will informed about that id. The client open the specific board if the id will be read by the connected barcode scanner.

## Install Client on PI

```
sudo npm install -g forerver
sudo npm install -g lettersorter
mkdir /home/pi/log
```

For automatic start on boot, change `/etc/inittab`

```
# 1:2345:respawn:/sbin/getty --noclear 38400 tty1
1:2345:respawn:/bin/login -f pi tty1 </dev/tty1 >/dev/tty1 2>&1
```

Add the start command at the end of `/home/pi/.bashrc`.
```
forerver start \
-m 1 \
-l /home/pi/log/foerever.log \
-o /home/pi/log/stdout.log \
-e /home/pi/log/stderr.log \
sorter client \
--boards 4 \
--boardPin1 5 \
--optoPin1 7 \
--boardPin2 11 \
--optoPin2 13 \
--boardPin3 8 \
--optoPin3 10 \
--boardPin4 16 \
--optoPin4 18
```

## PIN Overview
You can use pins marked with `---`. Opto-PINs are optional. If you don't use them the board will be closed after the board timeout. You can set the board timeout global with the option `--global_timeout` (default is 1000ms), or you set it per board with `--timeoutN`.

```
|-------------------||-------------------|
| #1   | 3.3V+      || #2   | 5V         |
|-------------------||-------------------|
| #3   | ---        || #4   | 5V+        |
|-------------------||-------------------|
| #5   | ---        || #6   | GND        |
|-------------------||-------------------|
| #7   | ---        || #8   | ---        |
|-------------------||-------------------|
| #9   | GND        || #10  | ---        |
|-------------------||-------------------|
| #11  | ---        || #12  | ---        |
|-------------------||-------------------|
| #13  | ---        || #14  | GND        |
|-------------------||-------------------|
| #15  | ---        || #16  | ---        |
|-------------------||-------------------|
| #17  | GND        || #18  | ---        |
|-------------------||-------------------|
| #19  | ---        || #20  | GND        |
|-------------------||-------------------|
| #21  | ---        || #22  | ---        |
|-------------------||-------------------|
| #23  | ---        || #24  | ---        |
|-------------------||-------------------|
| #25  | GND        || #26  | LED        |
|-------------------||-------------------|
| #27  | ---        || #28  | ---        |
|-------------------||-------------------|
| #29  | ---        || #30  | ---        |
|-------------------||-------------------|
| #31  | ---        || #32  | ---        |
|-------------------||-------------------|
| #33  | ---        || #34  | ---        |
|-------------------||-------------------|
| #35  | ---        || #36  | ---        |
|-------------------||-------------------|
| #37  | ---        || #38  | ---        |
|-------------------||-------------------|
| #39  | ---        || #40  | ---        |
|-------------------||-------------------|

```
