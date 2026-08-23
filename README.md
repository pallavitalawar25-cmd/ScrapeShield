# ScrapeShield

Self-Healing Web Data Infrastructure

## Problem

Modern websites change frequently, causing traditional web scrapers
to silently break and produce incomplete or incorrect data.

## Solution

ScrapeShield monitors extracted fields, identifies extraction failures,
and runs a self-healing workflow to restore the data pipeline.

## Architecture

Website
   ↓
Bright Data Scraper Studio
   ↓
Structured JSON
   ↓
Flask API
   ↓
Health Monitoring
   ↓
Self-Healing Engine
   ↓
Dashboard

## Bright Data Usage

Scraper Studio was used to build the books.toscrape.com collector.

The collector extracts:

- Title
- Price
- Availability
- Rating
- Category
- Product URL

## Tech Stack

- Bright Data Scraper Studio
- Python
- Flask
- JavaScript
- HTML
- CSS
- REST API
- Render

## 🔐 Environment Variables

Create backend/.env:

BRIGHTDATA_API_TOKEN=your_token_here

Never commit the .env file.


## Features

- Bright Data collector integration
- Structured data extraction
- Field-level health monitoring
- Extraction success rates
- Self-healing workflow
- Recovery timeline
- Live scraped record
- Cybersecurity-inspired dashboard

## Demo

[Live Demo]

[YouTube Demo]

## Project Structure

...
                 BOOKS.TOSCRAPE.COM
                         │
                         ▼
              Bright Data Scraper Studio
                         │
                         ▼
                Bright Data Collector
                  c_mt4depzp1d2e94mq76
                         │
                         ▼
                  ScrapeShield API
                       Flask
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Structured JSON        Health Monitor
              │                     │
              ▼                     ▼
        Latest Record          Field Health
                                    │
                                    ▼
                           Self-Healing Engine
                                    │
                                    ▼
                              Recovery Flow
                                    │
                                    ▼
                             🟢 RESTORED


## 🏆 Hackathon

Built for Bright Data Scrape-Verse.