#!/usr/bin/env node

const fs = require('fs');

class MockChartListener {
  constructor(symbol, timeframe) {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.currentPrice = 57821;
  }
  
  run(iterations) {
    for (let i = 0; i < iterations; i++) {
      const change = (Math.random() - 0.5) * 500;
      this.currentPrice += change;
      console.log(`[Chart Update ${i + 1}] ${this.symbol} ${this.timeframe}: $${this.currentPrice.toFixed(2)}`);
    }
  }
}

class ChartAgent {
  constructor() {
    this.strategies = this.loadStrategies();
    this.rules = this.loadRules();
  }

  loadStrategies() {
    const path = './strategies.json';
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8').trim();
      return content ? JSON.parse(content) : {};
    }
    return {};
  }

  loadRules() {
    const path = './active-rules.md';
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, 'utf8');
    }
    return '';
  }

  detectMode(input) {
    if (input.includes('Strategy:')) return 'strategy';
    if (input.includes('Rule:')) return 'rule';
    if (input.includes('Feedback:')) return 'feedback';
    if (input.includes('Execute')) return 'execute';
    return 'ask';
  }

  detectRiskLevel(input) {
    if (input.match(/high.?risk/i)) return 'high';
    if (input.match(/mid.?risk/i)) return 'mid';
    if (input.match(/low.?risk/i)) return 'low';
    return 'unknown';
  }

  handleInput(input) {
    const mode = this.detectMode(input);
    const risk = this.detectRiskLevel(input);
    return `[AGENT] Mode: ${mode} | Risk: ${risk}\nProcessing: ${input}`;
  }
}

class TradeExecutor {
  constructor() {
    this.executedTrades = [];
  }

  executeTrade(input, riskLevel) {
    const trade = {
      id: Date.now(),
      input,
      riskLevel,
      status: 'executed',
      timestamp: new Date().toISOString()
    };
    this.executedTrades.push(trade);
    return trade;
  }

  displayTradeConfirmation(trade) {
    console.log(`[TRADE] ID: ${trade.id}`);
    console.log(`[TRADE] Risk: ${trade.riskLevel}`);
    console.log(`[TRADE] Status: ${trade.status}`);
  }
}

class Controller {
  constructor() {
    this.agent = new ChartAgent();
    this.listener = new MockChartListener('BTC', '1h');
    this.executor = new TradeExecutor();
    this.sessionLog = [];
  }

  processUserInput(input) {
    console.log(`\n[USER INPUT] ${input}\n`);
    const agentResponse = this.agent.handleInput(input);
    console.log(agentResponse);

    if (input.includes('Execute')) {
      const risk = this.agent.detectRiskLevel(input);
      console.log(`\n[EXECUTOR] Processing trade...\n`);
      const trade = this.executor.executeTrade(input, risk);
      this.executor.displayTradeConfirmation(trade);
    }

    this.sessionLog.push({ input, timestamp: new Date().toISOString() });
  }

  runChartListener(iterations = 5) {
    console.log(`\n[STARTING CHART LISTENER]\n`);
    this.listener.run(iterations);
  }

  displayStatus() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[SESSION STATUS]\n`);
    console.log(`  Active Strategies: ${Object.keys(this.agent.strategies).length}`);
    console.log(`  Active Rules: ${this.agent.rules.split('\n').filter(l => l.includes('Rule')).length}`);
    console.log(`  Executed Trades: ${this.executor.executedTrades.length}`);
    console.log(`  Session Logs: ${this.sessionLog.length}`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

// Demo workflow
const controller = new Controller();

console.log(`\n${'='.repeat(60)}`);
console.log(`CHART AGENT DEMO WORKFLOW`);
console.log(`${'='.repeat(60)}`);

controller.runChartListener(3);
console.log(`\n[STEP 1: Create Strategy]\n`);
controller.processUserInput('Strategy: Breakout above 60k with volume confirmation');

console.log(`\n[STEP 2: Create Rule]\n`);
controller.processUserInput('Rule: Only enter on 4-hour confirmation');

console.log(`\n[STEP 3: Feedback]\n`);
controller.processUserInput('Feedback: BTC testing 58k support, volume weak');

console.log(`\n[STEP 4: Execute Trade]\n`);
controller.processUserInput("Execute: $500 on high risk, 10x leverage, stop at 57k, target 60k");

controller.displayStatus();
