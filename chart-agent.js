#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = './';

class ChartAgent {
  constructor() {
    this.trades = this.loadTrades();
    this.rules = this.loadRules();
    this.strategies = this.loadStrategies();
  }

  loadTrades() {
    let allTrades = {};
    ['winning-trades.json', 'losing-trades.json', 'winning-ideas.json', 'losing-ideas.json'].forEach(file => {
      const filePath = path.join(DATA_DIR, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        allTrades[file] = content ? JSON.parse(content) : [];
      } else {
        allTrades[file] = [];
      }
    });
    return allTrades;
  }

  loadRules() {
    const filePath = path.join(DATA_DIR, 'active-rules.md');
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  }

  loadStrategies() {
    const filePath = path.join(DATA_DIR, 'strategies.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      return content ? JSON.parse(content) : {};
    }
    return {};
  }

  detectMode(input) {
    if (input.includes('Strategy:')) return 'strategy';
    if (input.includes('Rule:')) return 'rule';
    if (input.includes('Feedback:')) return 'feedback';
    if (input.includes('Execute')) return 'execute';
    return 'ask';
  }

  detectBroker(input) {
    if (input.match(/hyperliquid|crypto|bitcoin|btc|eth/i)) return 'crypto';
    if (input.match(/mt5|metatrader|forex|eur\/usd|gold/i)) return 'forex';
    return 'unknown';
  }

  detectRiskLevel(input) {
    if (input.match(/high.?risk|aggressive|max/i)) return 'high';
    if (input.match(/mid.?risk|medium|balanced/i)) return 'mid';
    if (input.match(/low.?risk|conservative|swing/i)) return 'low';
    return 'unknown';
  }

  handleInput(userInput) {
    const mode = this.detectMode(userInput);
    const broker = this.detectBroker(userInput);
    const risk = this.detectRiskLevel(userInput);
    console.log(`[Chart Agent] Mode: ${mode} | Broker: ${broker} | Risk: ${risk}`);
    
    if (mode === 'strategy') return this.handleStrategy(userInput, broker);
    if (mode === 'feedback') return this.handleFeedback(userInput, broker);
    if (mode === 'rule') return this.handleRule(userInput, broker);
    if (mode === 'execute') return this.handleExecute(userInput, broker, risk);
    return 'Are you looking for feedback or should I save this as a rule?';
  }

  handleFeedback(input, broker) {
    let response = `[FEEDBACK MODE]\nBroker: ${broker}\nYour thinking:\n${input}\n`;
    if (broker === 'crypto') response += `\n[Crypto math: leverage × position = exposure]\n`;
    else if (broker === 'forex') response += `\n[Forex math: lot size × contract = exposure]\n`;
    response += `Questions:\n- Target profit?\n- Stop loss?\n- Matches existing rules?\n`;
    return response;
  }

  handleRule(input, broker) {
    const rulesPath = path.join(DATA_DIR, 'active-rules.md');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(rulesPath, `\n## Rule - ${timestamp}\n${input}\n`);
    return `[RULE MODE]\n✓ Rule saved to active-rules.md`;
  }

  handleStrategy(input, broker) {
    const timestamp = new Date().toISOString();
    const strategiesPath = path.join(DATA_DIR, 'strategies.json');
    let strategies = {};
    if (fs.existsSync(strategiesPath)) {
      const content = fs.readFileSync(strategiesPath, 'utf8').trim();
      strategies = content ? JSON.parse(content) : {};
    }
    strategies[timestamp] = { 
      timestamp, 
      description: input, 
      broker, 
      winCount: 0, 
      lossCount: 0, 
      status: 'active' 
    };
    fs.writeFileSync(strategiesPath, JSON.stringify(strategies, null, 2));
    return `[STRATEGY MODE]\n✓ Strategy saved to strategies.json`;
  }

  handleExecute(input, broker, risk) {
    let response = `[EXECUTE MODE]\nBroker: ${broker}\nRisk: ${risk}\nTrade: ${input}\n`;
    if (risk === 'high') response += `⚡ AUTO-EXECUTING\n`;
    else if (risk === 'mid') response += `⚠️ ASKING FOR CONFIRMATION\n`;
    else response += `✓ SWING TRADE LOGGED\n`;
    response += `Waiting for broker API...\n`;
    return response;
  }
}

const agent = new ChartAgent();
const input = process.argv[2] || 'Rule: Test';
console.log(agent.handleInput(input));
