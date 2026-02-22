const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;

// Simple in-memory agent
class TradingAgent {
  constructor() {
    this.rules = [];
    this.strategies = [];
    this.conversationHistory = [];
  }

  detectBroker(input) {
    const lower = input.toLowerCase();
    if (lower.match(/hyperliquid|btc|eth|crypto|perps/)) return 'hyperliquid';
    if (lower.match(/gmx/)) return 'gmx';
    if (lower.match(/oanda|forex|eur|gbp|pip/)) return 'forex';
    if (lower.match(/hugosway|mt4|mt5/)) return 'metaapi';
    return 'demo';
  }

  detectMode(input) {
    const lower = input.toLowerCase();
    if (lower.includes('strategy:')) return 'strategy';
    if (lower.includes('rule:')) return 'rule';
    if (lower.includes('feedback:')) return 'feedback';
    if (lower.includes('execute') || lower.includes('buy') || lower.includes('sell')) return 'execute';
    return 'ask';
  }

  detectRiskLevel(input) {
    const lower = input.toLowerCase();
    if (lower.match(/high.?risk|aggressive/)) return 'high';
    if (lower.match(/low|conservative/)) return 'low';
    return 'medium';
  }

  parseTradeParams(input) {
    const amountMatch = input.match(/\$?(\d+)/);
    const leverageMatch = input.match(/(\d+)x/i);
    const stopMatch = input.match(/stop(?:.at)?\s*(\d+)/i);
    const targetMatch = input.match(/(?:target|tp)\s*(\d+)/i);
    return {
      amount: amountMatch ? parseInt(amountMatch[1]) : null,
      leverage: leverageMatch ? parseInt(leverageMatch[1]) : 1,
      stopLoss: stopMatch ? parseFloat(stopMatch[1]) : null,
      takeProfit: targetMatch ? parseFloat(targetMatch[1]) : null
    };
  }

  process(input) {
    const mode = this.detectMode(input);
    const broker = this.detectBroker(input);
    const risk = this.detectRiskLevel(input);
    
    let response = '';
    
    switch (mode) {
      case 'rule':
        const ruleText = input.replace(/^rule:\s*/i, '');
        this.rules.push({ text: ruleText, broker, created: new Date().toISOString() });
        response = `📋 [RULE SAVED]\n\n"${ruleText}"\n\nBroker: ${broker}\n\nI'll check all trades against this rule.`;
        break;
        
      case 'strategy':
        const stratText = input.replace(/^strategy:\s*/i, '');
        this.strategies.push({ text: stratText, broker, created: new Date().toISOString() });
        response = `📈 [STRATEGY SAVED]\n\n"${stratText}"\n\nI'll watch for this setup.`;
        break;
        
      case 'feedback':
        const feedback = input.replace(/^feedback:\s*/i, '');
        response = `💡 [FEEDBACK LOGGED]\n\n"${feedback}"\n\nBroker: ${broker}\n\nQuestions:\n- Target price?\n- Stop loss?\n- Matches any rules?`;
        break;
        
      case 'execute':
        const params = this.parseTradeParams(input);
        response = `🚀 [EXECUTE MODE]\n\nBroker: ${broker}\nRisk: ${risk}\n\nAmount: $${params.amount || 'TBD'}\nLeverage: ${params.leverage}x\nStop: ${params.stopLoss || 'TBD'}\nTarget: ${params.takeProfit || 'TBD'}\n\n⚠️ Confirm to proceed?`;
        break;
        
      default:
        response = `💬 [ASK MODE]\n\nTry:\n• "Rule: Only trade on 4h"\n• "Feedback: BTC at 58k support"\n• "Strategy: Breakout above 60k"\n• "Execute: $1000 BTC 5x stop 57k target 62k"`;
    }
    
    this.conversationHistory.push({ role: 'user', content: input });
    this.conversationHistory.push({ role: 'assistant', content: response });
    
    return response;
  }

  getStatus() {
    return {
      mode: 'ready',
      broker: 'unknown',
      rulesCount: this.rules.length,
      strategiesCount: this.strategies.length
    };
  }
}

const agent = new TradingAgent();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { message } = JSON.parse(body);
        const response = agent.process(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response, status: agent.getStatus() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'running', agent: agent.getStatus() }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[Agent Server] Running on http://localhost:${PORT}`);
  console.log(`[Agent Server] POST /chat with { "message": "your text" }`);
});
