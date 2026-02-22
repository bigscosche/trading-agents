#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TradeExecutor {
  constructor() {
    this.executedTrades = [];
    this.demoBalance = 10000;
    this.trades = this.loadTrades();
  }

  loadTrades() {
    const files = {
      winning: './winning-trades.json',
      losing: './losing-trades.json'
    };
    let allTrades = { winning: [], losing: [] };
    
    Object.entries(files).forEach(([key, filePath]) => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        allTrades[key] = content ? JSON.parse(content) : [];
      }
    });
    return allTrades;
  }

  parseTradeCommand(input) {
    const parsed = {
      raw: input,
      amount: null,
      leverage: 1,
      stopLoss: null,
      target: null,
      riskLevel: 'unknown'
    };

    // Extract amount ($500, $1000, etc)
    const amountMatch = input.match(/\$(\d+)/);
    if (amountMatch) parsed.amount = parseInt(amountMatch[1]);

    // Extract leverage (5x, 10x, 50x)
    const leverageMatch = input.match(/(\d+)x/i);
    if (leverageMatch) parsed.leverage = parseInt(leverageMatch[1]);

    // Extract stop loss
    const stopMatch = input.match(/stop\s*(?:at|loss)?:?\s*(\d+)/i);
    if (stopMatch) parsed.stopLoss = parseInt(stopMatch[1]);

    // Extract target
    const targetMatch = input.match(/target:?\s*(\d+)/i);
    if (targetMatch) parsed.target = parseInt(targetMatch[1]);

    // Detect risk level
    if (input.match(/high.?risk/i)) parsed.riskLevel = 'high';
    else if (input.match(/mid.?risk/i)) parsed.riskLevel = 'mid';
    else if (input.match(/low.?risk/i)) parsed.riskLevel = 'low';

    return parsed;
  }

  calculateExpectedPnL(entry, stop, target, leverage, amount) {
    const riskAmount = Math.abs(entry - stop);
    const rewardAmount = Math.abs(target - entry);
    const riskRatio = rewardAmount / riskAmount;
    
    return {
      riskAmount: riskAmount.toFixed(2),
      rewardAmount: rewardAmount.toFixed(2),
      riskRatio: riskRatio.toFixed(2),
      potentialProfit: (amount * leverage * riskRatio).toFixed(2),
      potentialLoss: (amount * leverage).toFixed(2)
    };
  }

  executeTrade(tradeCommand, riskLevel = 'unknown') {
    const parsed = this.parseTradeCommand(tradeCommand);
    
    if (!parsed.amount) {
      return { error: 'No amount specified' };
    }

    const trade = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      command: tradeCommand,
      parsed: parsed,
      riskLevel: riskLevel,
      status: 'executed',
      demoMode: true
    };

    // Add PnL if we have stop and target
    if (parsed.stopLoss && parsed.target) {
      const currentPrice = 57821;
      trade.expectedPnL = this.calculateExpectedPnL(
        currentPrice,
        parsed.stopLoss,
        parsed.target,
        parsed.leverage,
        parsed.amount
      );
    }

    this.executedTrades.push(trade);
    this.logTrade(trade);

    return trade;
  }

  logTrade(trade) {
    const logsPath = './trade-execution-log.json';
    let logs = [];
    
    if (fs.existsSync(logsPath)) {
      const content = fs.readFileSync(logsPath, 'utf8').trim();
      logs = content ? JSON.parse(content) : [];
    }

    logs.push(trade);
    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
  }

  simulateTradeOutcome(trade) {
    if (!trade.expectedPnL) return null;

    const won = Math.random() > 0.4;
    
    return {
      tradeId: trade.id,
      outcome: won ? 'WIN' : 'LOSS',
      profitLoss: won ? 
        parseFloat(trade.expectedPnL.potentialProfit) : 
        -parseFloat(trade.expectedPnL.potentialLoss),
      timestamp: new Date().toISOString()
    };
  }

  displayTradeConfirmation(trade) {
    console.log(`\n[TRADE EXECUTED]\n`);
    console.log(`  ID: ${trade.id}`);
    console.log(`  Amount: $${trade.parsed.amount}`);
    console.log(`  Leverage: ${trade.parsed.leverage}x`);
    console.log(`  Risk Level: ${trade.riskLevel}`);
    console.log(`  Status: ${trade.status}`);
    console.log(`  Mode: DEMO (no real funds)\n`);

    if (trade.expectedPnL) {
      console.log(`[EXPECTED OUTCOMES]\n`);
      console.log(`  Risk/Reward Ratio: 1:${trade.expectedPnL.riskRatio}`);
      console.log(`  Potential Profit: $${trade.expectedPnL.potentialProfit}`);
      console.log(`  Potential Loss: $${trade.expectedPnL.potentialLoss}\n`);

      const outcome = this.simulateTradeOutcome(trade);
      console.log(`[SIMULATED OUTCOME]\n`);
      console.log(`  Result: ${outcome.outcome}`);
      console.log(`  P/L: $${outcome.profitLoss.toFixed(2)}\n`);
    }

    console.log(`[LOGGED] Trade saved to trade-execution-log.json\n`);
  }
}

const executor = new TradeExecutor();
const command = process.argv[2] || 'Execute: $500 on 10x leverage, stop at 56k, target 62k';
const riskLevel = process.argv[3] || 'unknown';

const trade = executor.executeTrade(command, riskLevel);
if (trade.error) {
  console.log(`ERROR: ${trade.error}`);
} else {
  executor.displayTradeConfirmation(trade);
}
