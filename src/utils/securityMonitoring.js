/**
 * Security monitoring and attack detection utilities
 */

const attackPatterns = new Map();
const suspiciousIPs = new Set();
const monitoringWindow = 24 * 60 * 60 * 1000; // 24 hours

export const securityMonitoring = {
  /**
   * Detect coordinated botnet attacks
   */
  detectCoordinatedAttack() {
    const now = Date.now();
    const recentAttempts = [];
    
    // Collect recent failed attempts from all sources
    for (const [key, data] of attackPatterns.entries()) {
      if (now - data.lastAttempt < 60 * 60 * 1000) { // Last hour
        recentAttempts.push({
          source: key,
          attempts: data.count,
          timespan: now - data.firstAttempt
        });
      }
    }

    // Botnet detection heuristics
    const uniqueSources = recentAttempts.length;
    const totalAttempts = recentAttempts.reduce((sum, item) => sum + item.attempts, 0);
    const avgAttemptsPerSource = totalAttempts / uniqueSources || 0;

    // Potential botnet indicators:
    // 1. Many different IPs with few attempts each (distributed)
    // 2. High total volume from many sources
    // 3. Similar timing patterns
    
    const isBotnetLike = 
      uniqueSources > 20 && // Many different sources
      avgAttemptsPerSource < 3 && // Few attempts per source
      totalAttempts > 100; // High total volume

    if (isBotnetLike) {
      console.warn(`🚨 POTENTIAL BOTNET DETECTED: ${uniqueSources} sources, ${totalAttempts} total attempts`);
      
      return {
        detected: true,
        confidence: this.calculateConfidence(recentAttempts),
        sources: uniqueSources,
        totalAttempts,
        avgAttemptsPerSource
      };
    }

    return { detected: false };
  },

  /**
   * Calculate confidence level of botnet detection
   */
  calculateConfidence(attempts) {
    // Simple confidence scoring based on distribution patterns
    const sources = attempts.length;
    const avgAttempts = attempts.reduce((sum, item) => sum + item.attempts, 0) / sources;
    
    let confidence = 0;
    
    // More sources = higher confidence
    if (sources > 50) confidence += 0.4;
    else if (sources > 20) confidence += 0.2;
    
    // Low attempts per source = higher confidence
    if (avgAttempts < 2) confidence += 0.3;
    else if (avgAttempts < 5) confidence += 0.1;
    
    // Timing distribution analysis
    const timespans = attempts.map(a => a.timespan);
    const avgTimespan = timespans.reduce((sum, t) => sum + t, 0) / timespans.length;
    const variance = timespans.reduce((sum, t) => sum + Math.pow(t - avgTimespan, 2), 0) / timespans.length;
    
    // Similar timing patterns suggest coordination
    if (variance < avgTimespan * 0.5) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
  },

  /**
   * Track failed login attempt patterns
   */
  trackFailedAttempt(ip, userAgent, targetUser) {
    const now = Date.now();
    const key = `${ip}:${userAgent?.substring(0, 50)}`;
    
    let data = attackPatterns.get(key);
    if (!data || now - data.firstAttempt > monitoringWindow) {
      data = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        targetUsers: new Set(),
        ip,
        userAgent
      };
    }
    
    data.count++;
    data.lastAttempt = now;
    if (targetUser) data.targetUsers.add(targetUser);
    
    attackPatterns.set(key, data);
    
    // Mark IP as suspicious after multiple attempts
    if (data.count > 10) {
      suspiciousIPs.add(ip);
    }
    
    // Check for coordinated attack every 50 attempts
    if (data.count % 50 === 0) {
      this.detectCoordinatedAttack();
    }
  },

  /**
   * Get attack statistics for monitoring dashboard
   */
  getAttackStats() {
    const now = Date.now();
    const recentWindow = 60 * 60 * 1000; // 1 hour
    
    let recentAttempts = 0;
    let activeSources = 0;
    let targetedUsers = new Set();
    
    for (const [key, data] of attackPatterns.entries()) {
      if (now - data.lastAttempt < recentWindow) {
        activeSources++;
        recentAttempts += data.count;
        data.targetUsers.forEach(user => targetedUsers.add(user));
      }
    }
    
    return {
      recentAttempts,
      activeSources,
      targetedUsers: targetedUsers.size,
      suspiciousIPs: suspiciousIPs.size,
      totalPatterns: attackPatterns.size
    };
  },

  /**
   * Check if IP is flagged as suspicious
   */
  isSuspiciousIP(ip) {
    return suspiciousIPs.has(ip);
  },

  /**
   * Clean up old monitoring data
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, data] of attackPatterns.entries()) {
      if (now - data.lastAttempt > monitoringWindow) {
        attackPatterns.delete(key);
      }
    }
    
    // Reset suspicious IPs daily
    if (Math.random() < 0.01) { // 1% chance per cleanup call
      suspiciousIPs.clear();
    }
  }
};

// Auto-cleanup every 10 minutes
setInterval(() => {
  securityMonitoring.cleanup();
}, 10 * 60 * 1000);