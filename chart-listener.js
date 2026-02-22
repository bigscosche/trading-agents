#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class MockChartListener {
  constructor(symbol = 'BTC', timeframe = '1h') {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.priceHistory = [];
    this.volumeHistory = [];
    this.currentPrice = this.getRandomPrice();
    this.currentVolume = this.getRandomVolume();
    this.strategies = this.loadStrategies();
    this.detectedPatterns = [];
  }

  loadStrategies() {
    const strategiesPath = path.join('./', 'strategies.json');
    if (fs.existsSync(strategiesPath)) {
      const content = fs.readFileSync(strategiesPath, 'utf8').trim();
      return content ? JSON.parse(content) : {};
    }
    return {};
  }

  getRandomPrice() {
    if (this.symbol === 'BTC') return 55000 + Math.random() * 10000;
    if (this.symbol === 'EUR/USD') return 1.08 + Math.random() * 0.02;
    return Math.random() * 100;
  }

  getRandomVolume() {
    return Math.floor(Math.random() * 100000) + 50000;
  }

  simulatePriceUpdate() {
    const change = (Math.random() - 0.5) * 500;
    this.currentPrice += change;
    this.priceHistory.push(this.currentPrice);
    
    const volumeChange = (Math.random() - 0.5) * 20000;
    this.currentVolume += volumeChange;
    this.volumeHistory.push(this.currentVolume);

    return {
      symbol: this.symbol,
      timeframe: this.timeframe,
      price: this.currentPrice.toFixed(2),
      volume: Math.floor(this.currentVolume),
      timestamp: new Date().toISOString(),
      change: change.toFixed(2)
    };
  }

  detectBreakout(resistanceLevel) {
    if (this.currentPrice > resistanceLevel) {
      const volumeAvg = this.volumeHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const isHighVolume = this.currentVolume > volumeAvg * 1.5;
      
      return {
        type: 'breakout',
        level: resistanceLevel,
        currentPrice: this.currentPrice.toFixed(2),
        volume: this.currentVolume,
        highVolume: isHighVolume,
        detected: true
      };
    }
    return { detected: false };
  }

  detectSupport(supportLevel) {
    if (this.currentPrice < supportLevel && this.currentPrice > supportLevel * 0.98) {
      return {
        type: 'support-touch',
        level: supportLevel,
        currentPrice: this.currentPrice.toFixed(2),
        detected: true
      };
    }
    return { detected: false };
  }

  checkStrategies() {
    const results = [];
    Object.values(this.strategies).forEach(strategy => {
      if (strategy.description.includes('breakout') && strategy.description.includes('60k')) {
        const breakout = this.detectBreakout(60000);
        if (breakout.detected) {
          results.push({
            strategy: strategy.description,
            match: breakout,
            action: 'ALERT: Breakout strategy triggered!'
          });
        }
      }
    });
    return results;
  }

  run(iterations = 5) {
    console.log(`\n[Chart Listener] Starting mock chart for ${this.symbol} ${this.timeframe}`);
    console.log(`=`.repeat(60));

    for (let i = 0; i < iterations; i++) {
      const update = this.simulatePriceUpdate();
      console.log(`\n[Update ${i + 1}]`);
      console.log(`  Price: $${update.price}`);
      console.log(`  Volume: ${update.volume}`);
      console.log(`  Change: ${update.change}`);

      const strategyMatches = this.checkStrategies();
      if (strategyMatches.length > 0) {
        strategyMatches.forEach(match => {
          console.log(`  🔔 ${match.action}`);
          console.log(`     Match: ${JSON.stringify(match.match)}`);
        });
      }
    }

    console.log(`\n` + `=`.repeat(60));
    console.log(`[Chart Listener] Final Price: $${this.currentPrice.toFixed(2)}`);
    console.log(`[Chart Listener] Session ended\n`);
  }
}

// Run listener
const listener = new MockChartListener('BTC', '1h');
listener.run(10);
