# Network Monitoring Dashboard

A lightweight network-monitoring dashboard built with **Python, Flask, SQLite, HTML, CSS and JavaScript**.

This project monitors configured devices and hosts and displays their network status through a simple web dashboard. It demonstrates **networking, Python backend development, database management, frontend development and troubleshooting** in one project.

## Features

- **Device Availability** — checks whether a configured host is reachable
- **Latency Monitoring** — measures average ping response time in milliseconds
- **Packet Loss Detection** — calculates the percentage of packets that are lost
- **DNS Resolution** — resolves hostnames such as `google.com`
- **TCP Port Check** — checks whether a configured TCP service port is reachable
- **Recent Uptime** — displays the percentage of successful recent checks
- **Performance History** — stores measurements in SQLite for later analysis
- **Latency History Chart** — displays latency changes over time
- **Packet Loss History Chart** — displays packet-loss changes over time
- **Automatic Refresh** — rechecks configured targets every 30 seconds
- **Alert Notifications** — displays notifications when a network problem is detected

## Alert Notification System

A custom alert notification feature was added to make network problems easier to identify.

The dashboard generates notifications based on the latest network measurements:

| Condition | Notification |
|---|---|
| Device is unreachable | 🔴 Device is OFFLINE |
| Packet loss > 20% | 🟠 High Packet Loss |
| Latency > 200 ms | 🟡 High Latency |
| Normal network condition | 🟢 Network is Healthy |

Notifications appear on the dashboard when a problem is detected.

The notification system also avoids repeatedly showing the same alert during every automatic refresh.

## What the Dashboard Monitors

For every configured device or host, the application can display:

- Online / Offline status
- Average latency
- Packet loss percentage
- DNS resolution
- TCP port connectivity
- Recent uptime
- Historical measurements
- Latency trends
- Packet-loss trends
- Network alerts

## Example Use

A small office could monitor devices such as:

| Device | Host | Optional Port | Purpose |
|---|---|---:|---|
| Router | `192.168.1.1` | — | Check whether the gateway is reachable |
| NAS | `192.168.1.10` | `445` | Check NAS availability and SMB connectivity |
| Printer | `192.168.1.20` | `9100` | Check printer availability and print-service connectivity |
| Website | `google.com` | `443` | Check DNS and HTTPS connectivity |

> Local addresses such as `192.168.x.x` can only be monitored when the application is running on a computer connected to the same network.

## How It Works

```text
Browser Dashboard
       |
       v
Flask Web Application
       |
       +--> DNS Lookup
       |
       +--> Ping Test
       |
       +--> TCP Port Check
       |
       +--> Alert Detection
       |
       v
SQLite Database
       |
       +--> Target Information
       |
       +--> Measurement History
       |
       v
History API
       |
       v
Performance Charts
