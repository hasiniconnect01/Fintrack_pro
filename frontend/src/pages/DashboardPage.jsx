import React, { useState, useEffect } from 'react'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'invoices' | 'wallets' | 'settings'

  // Global Currency State
  const [currencyCode, setCurrencyCode] = useState('USD') // 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY'
  const currencies = {
    USD: { symbol: '$', rate: 1.0, label: 'US Dollar (USD)' },
    EUR: { symbol: '€', rate: 0.92, label: 'Euro (EUR)' },
    GBP: { symbol: '£', rate: 0.78, label: 'British Pound (GBP)' },
    INR: { symbol: '₹', rate: 83.5, label: 'Indian Rupee (INR)' },
    JPY: { symbol: '¥', rate: 160.0, label: 'Japanese Yen (JPY)' }
  }

  // Helper to format currency values
  const formatVal = (baseAmount) => {
    const curr = currencies[currencyCode]
    const converted = baseAmount * curr.rate
    return `${curr.symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Dashboard Form State
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubscription, setIsSubscription] = useState(false)
  const [formError, setFormError] = useState('')

  // OCR State
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrStatusColor, setOcrStatusColor] = useState('var(--text-muted)')
  const [ocrLoading, setOcrLoading] = useState(false)

  // Auto-Receipt Matching State
  const [scannedReceipts, setScannedReceipts] = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [receiptsError, setReceiptsError] = useState('')
  const [syncEmailConnected, setSyncEmailConnected] = useState(true)
  const [syncGalleryConnected, setSyncGalleryConnected] = useState(true)
  const [receiptFilter, setReceiptFilter] = useState('all') // 'all' | 'exact' | 'partial' | 'none'
  const [manualLinkReceipt, setManualLinkReceipt] = useState(null)
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState('')

  // IMAP Configuration Inputs State
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [imapUsername, setImapUsername] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [showImapSettings, setShowImapSettings] = useState(false)
  const [imapConfigured, setImapConfigured] = useState(false)

  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Smart Invoices State
  const [invoices, setInvoices] = useState([])
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [invoiceValue, setInvoiceValue] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceError, setInvoiceError] = useState('')

  // Wallets State
  const [walletBalances, setWalletBalances] = useState({
    operating: 75000.0,
    reserve: 150000.0,
    cash: 5000.0
  })
  const [transferSource, setTransferSource] = useState('operating')
  const [transferTarget, setTransferTarget] = useState('reserve')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLogs, setTransferLogs] = useState([])
  const [walletError, setWalletError] = useState('')
  const [walletSuccess, setWalletSuccess] = useState('')

  // Settings State
  const [settingsBudget, setSettingsBudget] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [settingsError, setSettingsError] = useState('')

  // UI State
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fintrack_theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fintrack_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const handleScanReceipts = () => {
    if (!syncEmailConnected && !syncGalleryConnected) {
      setReceiptsError('No sync sources are enabled. Enable email or gallery synchronization first.')
      return
    }
    setReceiptsLoading(true)
    setReceiptsError('')
    setScannedReceipts([])

    setTimeout(async () => {
      try {
        const response = await fetch('/api/receipt-matching/scanned-receipts')
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Failed to retrieve scanned receipts.')

        let receipts = data.receipts || []
        setImapConfigured(data.imapConfigured)
        if (data.imapConfigured) {
          setImapUsername(data.imapUsername || '')
          setImapHost(data.imapHost || '')
        }

        // Filter based on active sync selections
        const filteredData = receipts.filter(item => {
          if (item.source === 'EMAIL' && !syncEmailConnected) return false
          if (item.source === 'GALLERY' && !syncGalleryConnected) return false
          return true
        })

        setScannedReceipts(filteredData)
        if (data.imapConfigured && syncEmailConnected) {
          setReceiptSuccessMsg('Scan complete! Fetched live receipt emails from your inbox.')
        } else {
          setReceiptSuccessMsg('Scan complete! Running in DEMO mode with mock receipts.')
        }
        setTimeout(() => setReceiptSuccessMsg(''), 4000)
      } catch (err) {
        setReceiptsError(err.message || 'Unable to scan digital sources.')
      } finally {
        setReceiptsLoading(false)
      }
    }, 1500) // 1.5 second scanning animation
  }

  const handleLinkReceipt = async (receipt, expenseId) => {
    try {
      const response = await fetch('/api/receipt-matching/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: expenseId,
          receiptSource: receipt.sourceName,
          receiptStatus: 'MATCHED'
        })
      })
      if (!response.ok) throw new Error('Failed to link receipt.')
      
      await fetchExpenses()
      
      // Update local state to reflect linked status
      setScannedReceipts(prev => prev.map(r => {
        if (r.id === receipt.id) {
          return { ...r, matchStatus: 'EXACT', matchedExpenseId: expenseId, matchedExpenseTitle: 'Linked Transaction' }
        }
        return r
      }))

      setReceiptSuccessMsg(`Linked ${receipt.merchant} receipt successfully!`)
      setManualLinkReceipt(null)
      setTimeout(() => setReceiptSuccessMsg(''), 4000)
    } catch (err) {
      console.error(err)
      alert(err.message)
    }
  }

  const handleCreateAndLinkReceipt = async (receipt) => {
    try {
      const currentRate = currencies[currencyCode].rate
      const baseAmount = receipt.amount / currentRate // Save in USD base

      const payload = {
        title: receipt.merchant,
        amount: baseAmount,
        category: 'Shopping', // Default category
        date: receipt.date,
        receiptSource: receipt.sourceName
      }
      
      const response = await fetch('/api/receipt-matching/create-and-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('Failed to create linked expense.')
      
      await fetchExpenses()
      
      // Update local state to reflect linked status
      setScannedReceipts(prev => prev.map(r => {
        if (r.id === receipt.id) {
          return { ...r, matchStatus: 'EXACT', matchedExpenseId: 9999, matchedExpenseTitle: receipt.merchant }
        }
        return r
      }))

      setReceiptSuccessMsg(`Created new transaction for ${formatVal(receipt.amount)} and linked receipt successfully!`)
      setTimeout(() => setReceiptSuccessMsg(''), 4000)
    } catch (err) {
      console.error(err)
      alert(err.message)
    }
  }

  const handleAutoMatchAll = async () => {
    const exactMatches = scannedReceipts.filter(r => r.matchStatus === 'EXACT' && r.matchedExpenseId)
    if (exactMatches.length === 0) return
    
    setReceiptsLoading(true)
    let linkedCount = 0
    try {
      for (const receipt of exactMatches) {
        const response = await fetch('/api/receipt-matching/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expenseId: receipt.matchedExpenseId,
            receiptSource: receipt.sourceName,
            receiptStatus: 'MATCHED'
          })
        })
        if (response.ok) {
          linkedCount++
        }
      }
      
      await fetchExpenses()
      
      // Update local state
      setScannedReceipts(prev => prev.map(r => {
        if (r.matchStatus === 'EXACT' && r.matchedExpenseId) {
          return { ...r, matchedExpenseTitle: 'Linked Transaction' }
        }
        return r
      }))
      
      setReceiptSuccessMsg(`Auto-matched and linked ${linkedCount} receipts!`)
      setTimeout(() => setReceiptSuccessMsg(''), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleSaveImapSettings = async (e) => {
    e.preventDefault()
    setReceiptsLoading(true)
    setReceiptsError('')
    try {
      const response = await fetch('/api/receipt-matching/save-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imapHost,
          imapPort: parseInt(imapPort),
          imapUsername,
          imapPassword
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to save settings.')
      
      setImapConfigured(true)
      setShowImapSettings(false)
      setReceiptSuccessMsg('IMAP settings saved successfully! Run "Scan Channels" to fetch live emails.');
      setTimeout(() => setReceiptSuccessMsg(''), 4000)
    } catch (err) {
      setReceiptsError(err.message || 'Failed to save IMAP configuration.')
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = e.target.files

    setReceiptsLoading(true)
    setReceiptsError('')
    setReceiptSuccessMsg('Processing gallery image uploads using real-time OCR engine...');

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const response = await fetch('/api/receipt-matching/upload-gallery', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to process gallery files.')

      setScannedReceipts(prev => [...data, ...prev])
      setReceiptSuccessMsg(`Successfully scanned ${data.length} images with real-time Tesseract OCR and matched them!`);
      setTimeout(() => setReceiptSuccessMsg(''), 5000)
    } catch (err) {
      setReceiptsError(err.message || 'OCR extraction failed. Try a clearer image.')
    } finally {
      setReceiptsLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  // Sync state with localStorage once user is loaded
  useEffect(() => {
    if (user) {
      // Load invoices
      const storedInvoices = localStorage.getItem(`fintrack_invoices_${user.email}`)
      if (storedInvoices) {
        setInvoices(JSON.parse(storedInvoices))
      } else {
        setInvoices([])
      }

      // Load wallet balances
      const storedWallets = localStorage.getItem(`fintrack_wallets_${user.email}`)
      if (storedWallets) {
        setWalletBalances(JSON.parse(storedWallets))
      } else {
        setWalletBalances({
          operating: 75000.0,
          reserve: 150000.0,
          cash: 5000.0
        })
      }

      // Load transfer logs
      const storedLogs = localStorage.getItem(`fintrack_transfer_logs_${user.email}`)
      if (storedLogs) {
        setTransferLogs(JSON.parse(storedLogs))
      } else {
        setTransferLogs([])
      }

      // Load currency preference
      const storedCurrency = localStorage.getItem(`fintrack_currency_${user.email}`)
      if (storedCurrency) {
        setCurrencyCode(storedCurrency)
      }
    }
  }, [user])

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Unauthorized')
      const data = await response.json()
      setUser(data)
      setSettingsBudget(data.monthlyBudget.toString())
      fetchExpenses()
    } catch (err) {
      window.location.href = '/index.html'
    }
  }

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses')
      if (!response.ok) throw new Error('Failed to fetch expenses')
      const data = await response.json()
      setExpenses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/index.html'
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!title || !amount || !date) {
      setFormError('Please enter a vendor, amount, and date.')
      return
    }

    setFormError('')
    // Keep internal values in base USD (convert input value if currency is not USD)
    const currentRate = currencies[currencyCode].rate
    const baseAmount = parseFloat(amount) / currentRate

    const payload = {
      title,
      amount: baseAmount,
      category,
      date,
      isSubscription
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Transaction refused by server.')
      }

      setTitle('')
      setAmount('')
      setIsSubscription(false)
      setDate(new Date().toISOString().split('T')[0])
      fetchExpenses()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      fetchExpenses()
    } catch (err) {
      console.error(err)
    }
  }

  const handleOcrFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setOcrFile(e.target.files[0])
      setOcrStatus(`Selected file: ${e.target.files[0].name}`)
      setOcrStatusColor('var(--brand-primary)')
    }
  }

  const handleOcrScan = async () => {
    if (!ocrFile) {
      setOcrStatus('Please select a receipt image file first.')
      setOcrStatusColor('var(--danger)')
      return
    }

    setOcrLoading(true)
    setOcrStatus('Processing receipt image with cloud OCR engines...')
    setOcrStatusColor('var(--brand-primary)')

    const formData = new FormData()
    formData.append('file', ocrFile)

    try {
      const response = await fetch('/api/expenses/scan', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Receipt scan failed.')

      // Display scanned amount in active currency
      const currentRate = currencies[currencyCode].rate
      const convertedAmount = (data.totalAmount || 0) * currentRate

      setTitle(data.merchant || 'Unknown Merchant')
      setAmount(convertedAmount.toFixed(2))
      if (data.date) setDate(data.date)

      // Auto-categorize
      const merchantLower = (data.merchant || '').toLowerCase()
      if (merchantLower.includes('starbucks') || merchantLower.includes('mcdonald') || merchantLower.includes('food') || merchantLower.includes('coffee') || merchantLower.includes('restaurant')) {
        setCategory('Food')
      } else if (merchantLower.includes('rent') || merchantLower.includes('housing') || merchantLower.includes('apartment')) {
        setCategory('Rent')
      } else if (merchantLower.includes('cinema') || merchantLower.includes('netflix') || merchantLower.includes('game') || merchantLower.includes('hulu') || merchantLower.includes('fun')) {
        setCategory('Entertainment')
      } else {
        setCategory('Other')
      }

      setOcrStatus('Receipt parsed and mapped successfully!')
      setOcrStatusColor('var(--success)')
      setOcrFile(null)
    } catch (err) {
      setOcrStatus(`OCR Error: ${err.message}`)
      setOcrStatusColor('var(--danger)')
    } finally {
      setOcrLoading(false)
    }
  }

  // Invoice Management
  const handleCreateInvoice = (e) => {
    e.preventDefault()
    if (!clientName || !clientEmail || !invoiceValue || !invoiceDueDate) {
      setInvoiceError('Please fill out all invoice parameters.')
      return
    }

    setInvoiceError('')
    const rate = currencies[currencyCode].rate
    const baseValue = parseFloat(invoiceValue) / rate // convert input to USD base

    const newInvoice = {
      id: 'INV-' + Math.floor(Math.random() * 900000 + 100000),
      clientName,
      clientEmail,
      amount: baseValue,
      dueDate: invoiceDueDate,
      status: 'Pending'
    }

    const updatedInvoices = [newInvoice, ...invoices]
    setInvoices(updatedInvoices)
    localStorage.setItem(`fintrack_invoices_${user.email}`, JSON.stringify(updatedInvoices))

    setClientName('')
    setClientEmail('')
    setInvoiceValue('')
    setInvoiceDueDate(new Date().toISOString().split('T')[0])
  }

  const toggleInvoicePaid = (id) => {
    const updated = invoices.map(inv => {
      if (inv.id === id) {
        return { ...inv, status: inv.status === 'Paid' ? 'Pending' : 'Paid' }
      }
      return inv
    })
    setInvoices(updated)
    localStorage.setItem(`fintrack_invoices_${user.email}`, JSON.stringify(updated))
  }

  const handleDeleteInvoice = (id) => {
    if (!window.confirm('Delete this invoice entry?')) return
    const updated = invoices.filter(inv => inv.id !== id)
    setInvoices(updated)
    localStorage.setItem(`fintrack_invoices_${user.email}`, JSON.stringify(updated))
  }

  // Wallet Fund Transfer Management
  const handleTransfer = (e) => {
    e.preventDefault()
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setWalletError('Please enter a valid transfer amount.')
      setWalletSuccess('')
      return
    }

    const amountToTransfer = parseFloat(transferAmount)
    const sourceBalance = walletBalances[transferSource]

    if (transferSource === transferTarget) {
      setWalletError('Source and target wallets must be different.')
      setWalletSuccess('')
      return
    }

    if (sourceBalance < amountToTransfer) {
      setWalletError('Insufficient funds in source wallet.')
      setWalletSuccess('')
      return
    }

    setWalletError('')
    const updatedBalances = {
      ...walletBalances,
      [transferSource]: sourceBalance - amountToTransfer,
      [transferTarget]: walletBalances[transferTarget] + amountToTransfer
    }

    setWalletBalances(updatedBalances)
    localStorage.setItem(`fintrack_wallets_${user.email}`, JSON.stringify(updatedBalances))

    const newLog = {
      id: 'TX-' + Math.floor(Math.random() * 90000 + 10000),
      source: transferSource,
      target: transferTarget,
      amount: amountToTransfer,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString()
    }

    const updatedLogs = [newLog, ...transferLogs]
    setTransferLogs(updatedLogs)
    localStorage.setItem(`fintrack_transfer_logs_${user.email}`, JSON.stringify(updatedLogs))

    setTransferAmount('')
    setWalletSuccess(`Transferred ${formatVal(amountToTransfer)} successfully!`)
  }

  // Settings Budget Syncing
  const handleUpdateBudget = async (e) => {
    e.preventDefault()
    if (!settingsBudget || parseFloat(settingsBudget) <= 0) {
      setSettingsError('Please enter a valid budget amount.')
      setSettingsSuccess('')
      return
    }

    setSettingsError('')
    setSettingsSuccess('')

    // Convert from current active currency into base USD for database consistency
    const rate = currencies[currencyCode].rate
    const baseBudget = parseFloat(settingsBudget) / rate

    try {
      const response = await fetch('/api/auth/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: baseBudget })
      })


      setUser(data)
      setSettingsSuccess('Monthly Capital Allocation updated successfully in database!')
    } catch (err) {
      setSettingsError(err.message)
    }
  }

  const handleCurrencyChange = (newCode) => {
    setCurrencyCode(newCode)
    if (user) {
      localStorage.setItem(`fintrack_currency_${user.email}`, newCode)
      // Recalculate settings budget display value
      const currentRate = currencies[newCode].rate
      const baseBudget = user.monthlyBudget
      setSettingsBudget((baseBudget * currentRate).toFixed(2))
    }
  }

  // Calculate Metrics
  const monthlyBudget = user ? user.monthlyBudget : 50000.0
  let totalSpent = 0
  let totalSubscriptions = 0

  expenses.forEach(exp => {
    const amt = exp.amount || 0
    if (exp.isSubscription || exp.subscription) {
      totalSubscriptions += amt
    } else {
      totalSpent += amt
    }
  })

  const grandTotal = totalSpent + totalSubscriptions
  const remainingBalance = monthlyBudget - grandTotal

  // Filter Expense ledger
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'All' || exp.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const userEmail = user ? user.email : 'user@fintrack.com'
  const userHandle = userEmail.split('@')[0]

  // System ID from username hash
  const getSystemId = () => {
    let hash = 0
    for (let i = 0; i < userHandle.length; i++) {
      hash = userHandle.charCodeAt(i) + ((hash << 5) - hash)
    }
    const id = Math.abs(hash % 1000000).toString().padStart(6, '0')
    return `FT-${id}`
  }

  // Category Colors
  const catColors = {
    Food: '#ef4444',
    Rent: '#6366f1',
    Entertainment: '#f59e0b',
    Other: '#64748b'
  }

  // SVG Donut Chart Calculation
  const getDonutChartData = () => {
    const totals = { Food: 0, Rent: 0, Entertainment: 0, Other: 0 }
    expenses.forEach(exp => {
      const cat = exp.category || 'Other'
      if (totals[cat] !== undefined) {
        totals[cat] += exp.amount
      } else {
        totals['Other'] += exp.amount
      }
    })

    const sum = Object.values(totals).reduce((a, b) => a + b, 0)
    if (sum === 0) return null

    let accumulatedPercentage = 0
    return Object.keys(totals).map(cat => {
      const value = totals[cat]
      const percentage = (value / sum) * 100
      const startAngle = (accumulatedPercentage / 100) * 360
      accumulatedPercentage += percentage
      return {
        category: cat,
        value,
        percentage,
        startAngle,
        color: catColors[cat]
      }
    }).filter(item => item.value > 0)
  }

  const chartData = getDonutChartData()

  // Invoice calculations
  const totalReceivables = invoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const overdueInvoicesCount = invoices.filter(inv => {
    if (inv.status !== 'Pending') return false
    const due = new Date(inv.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today
  }).length

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <i className="fa-solid fa-circle-notch fa-spin" style={styles.loadingSpinner}></i>
        <p style={{ marginTop: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>Loading financial environment...</p>
      </div>
    )
  }

  return (
    <div style={styles.dashboardContainer}>
      {/* Sidebar Panel */}
      <div style={{ ...styles.sidebar, width: sidebarCollapsed ? '80px' : '260px' }}>
        <div style={styles.brandWrapper}>
          <i className="fa-solid fa-wallet" style={styles.brandIcon}></i>
          {!sidebarCollapsed && <span style={styles.brandName}>FinTrack Pro</span>}
        </div>

        <ul style={styles.navMenu}>
          <li 
            style={{ ...styles.navItem, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <a href="#" style={styles.navLink}>
              <i className="fa-solid fa-chart-pie" style={styles.navIcon}></i>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </a>
          </li>
          <li 
            style={{ ...styles.navItem, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} 
            className={activeTab === 'invoices' ? 'active' : ''}
            onClick={() => setActiveTab('invoices')}
          >
            <a href="#" style={styles.navLink}>
              <i className="fa-solid fa-receipt" style={styles.navIcon}></i>
              {!sidebarCollapsed && <span>Smart Invoices</span>}
            </a>
          </li>
          <li 
            style={{ ...styles.navItem, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} 
            className={activeTab === 'wallets' ? 'active' : ''}
            onClick={() => setActiveTab('wallets')}
          >
            <a href="#" style={styles.navLink}>
              <i className="fa-solid fa-building-columns" style={styles.navIcon}></i>
              {!sidebarCollapsed && <span>Wallets</span>}
            </a>
          </li>
          <li 
            style={{ ...styles.navItem, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} 
            className={activeTab === 'receipts' ? 'active' : ''}
            onClick={() => setActiveTab('receipts')}
          >
            <a href="#" style={styles.navLink}>
              <i className="fa-solid fa-wand-magic-sparkles" style={styles.navIcon}></i>
              {!sidebarCollapsed && <span>Auto-Receipts</span>}
            </a>
          </li>
          <li 
            style={{ ...styles.navItem, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            <a href="#" style={styles.navLink}>
              <i className="fa-solid fa-gear" style={styles.navIcon}></i>
              {!sidebarCollapsed && <span>Settings</span>}
            </a>
          </li>
        </ul>

        {/* Collapsible toggle */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          style={styles.collapseBtn}
        >
          <i className={`fa-solid ${sidebarCollapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
        </button>

        {/* Profile Card Deck */}
        <div style={styles.profileDeckContainer}>
          <div 
            style={styles.userProfileRow} 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          >
            <div style={styles.userAvatar}>
              {userHandle.substring(0, 2).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div style={styles.userProfileInfo}>
                <p style={styles.profileUserHandle}>{userHandle}</p>
                <p style={styles.profilePlan}>Enterprise Plan</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <i className="fa-solid fa-ellipsis-vertical" style={styles.profileDots}></i>
            )}
          </div>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div style={{ ...styles.profileDropdown, left: sidebarCollapsed ? '60px' : '0' }}>
              <div style={styles.dropdownHeader}>
                <p style={styles.dropdownLabel}>System ID</p>
                <p style={styles.dropdownValue}>{getSystemId()}</p>
              </div>
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <div>
                  <p style={styles.dropdownLabel}>Profile Handle</p>
                  <p style={{ ...styles.dropdownValue, color: 'var(--brand-dark)', fontFamily: 'inherit', margin: 0 }}>
                    @{userHandle}
                  </p>
                </div>
                <button 
                  onClick={toggleTheme} 
                  style={{
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: theme === 'light' ? 'var(--brand-dark)' : '#fbbf24',
                    transition: 'all 0.2s'
                  }}
                  title="Toggle Dark/Light Theme"
                >
                  {theme === 'light' ? (
                    <i className="fa-solid fa-moon"></i>
                  ) : (
                    <i className="fa-solid fa-sun"></i>
                  )}
                </button>
              </div>
              <button onClick={handleLogout} className="btn-ui btn-danger-light" style={styles.signoutBtn}>
                <i className="fa-solid fa-right-from-bracket"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Workspace */}
      <div style={{ ...styles.mainContent, marginLeft: sidebarCollapsed ? '80px' : '260px' }}>
        
        {/* Render Tab Contents */}

        {activeTab === 'dashboard' && (
          <div>
            <div style={styles.dashboardHeader}>
              <div>
                <h2 style={styles.welcomeGreeting}>Welcome back, {userHandle}</h2>
                <p style={styles.headerSubtitle}>Here is a structured overview of your real-time cloud financial balance ledger.</p>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div style={styles.metricsGrid}>
              <div className="metric-card" style={styles.metricCard}>
                <div style={styles.metricInfo}>
                  <h4>Monthly Capital Allocation</h4>
                  <p>{formatVal(monthlyBudget)}</p>
                </div>
                <div style={{ ...styles.metricIcon, background: '#e0e7ff', color: 'var(--brand-primary)' }}>
                  <i className="fa-solid fa-vault"></i>
                </div>
              </div>

              <div className="metric-card" style={styles.metricCard}>
                <div style={styles.metricInfo}>
                  <h4>Aggregate Spending Sum</h4>
                  <p>{formatVal(totalSpent)}</p>
                </div>
                <div style={{ ...styles.metricIcon, background: '#fdf2f8', color: '#db2777' }}>
                  <i className="fa-solid fa-credit-card"></i>
                </div>
              </div>

              <div className="metric-card" style={{ ...styles.metricCard, borderLeft: '4px solid #db2777' }}>
                <div style={styles.metricInfo}>
                  <h4>Active Renewals</h4>
                  <p style={{ color: '#db2777' }}>{formatVal(totalSubscriptions)}</p>
                </div>
                <div style={{ ...styles.metricIcon, background: '#fff1f2', color: '#f43f5e' }}>
                  <i className="fa-solid fa-arrows-spin"></i>
                </div>
              </div>

              <div className="metric-card" style={{ ...styles.metricCard, borderLeft: remainingBalance < 0 ? '4px solid var(--danger)' : '1px solid var(--border)' }}>
                <div style={styles.metricInfo}>
                  <h4>Liquid Running Balance</h4>
                  <p style={{ color: remainingBalance < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {formatVal(remainingBalance)}
                  </p>
                </div>
                <div style={{ 
                  ...styles.metricIcon, 
                  background: remainingBalance < 0 ? '#fee2e2' : '#d1fae5', 
                  color: remainingBalance < 0 ? 'var(--danger)' : 'var(--success)' 
                }}>
                  <i className={remainingBalance < 0 ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-chart-line"}></i>
                </div>
              </div>
            </div>

            {/* Dual-Column Split Panel */}
            <div style={styles.dashboardSplit}>
              {/* AI OCR Receipt Scanner */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-camera" style={{ color: 'var(--success)' }}></i> 
                  AI Receipt Capture
                </h3>
                <p style={styles.panelDesc}>Upload image data assets to trigger cloud parsing layers instantly.</p>
                
                <div className={`file-dropzone ${ocrFile ? 'drag-active' : ''}`} style={{ marginBottom: '20px' }}>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {ocrFile ? ocrFile.name : 'Drag and drop receipt image or click to browse'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleOcrFileChange} />
                </div>

                <button 
                  type="button" 
                  className="btn-ui btn-success" 
                  onClick={handleOcrScan}
                  disabled={ocrLoading}
                  style={{ width: '100%' }}
                >
                  {ocrLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Running OCR Service...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Execute OCR Scan Engine
                    </>
                  )}
                </button>

                {ocrStatus && (
                  <p style={{ ...styles.ocrStatusMessage, color: ocrStatusColor }}>
                    {ocrStatus}
                  </p>
                )}
              </div>

              {/* Register New Transaction Form */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-file-invoice" style={{ color: 'var(--brand-primary)' }}></i>
                  Register New Transaction
                </h3>
                
                {formError && (
                  <div style={styles.formErrorAlert}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleAddExpense}>
                  <div className="input-group">
                    <label>Vendor Merchant Designation Name</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="e.g., Walmart Store Inc."
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Capital Cost Value ({currencies[currencyCode].symbol})</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="input-control" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label>Asset Class Category</label>
                      <select 
                        className="input-control"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Food">Food & Dining</option>
                        <option value="Rent">Housing & Rent</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Other">Other Miscellaneous</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>Settlement Timestamp Date</label>
                    <input 
                      type="date" 
                      className="input-control" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required 
                    />
                  </div>

                  <div style={styles.checkboxContainer}>
                    <input 
                      type="checkbox" 
                      id="isSubscription" 
                      checked={isSubscription}
                      onChange={(e) => setIsSubscription(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <label htmlFor="isSubscription" style={styles.checkboxLabel}>
                      Mark as Recurring Monthly Subscription
                    </label>
                  </div>

                  <button type="submit" className="btn-ui btn-solid" style={{ width: '100%' }}>
                    <i className="fa-solid fa-plus"></i> Finalize Settlement Registry
                  </button>
                </form>
              </div>
            </div>

            {/* Spending Insights Chart & Ledger Table Layout */}
            <div style={styles.dashboardSplit}>
              {/* Spend Category Visualization */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-chart-pie" style={{ color: 'var(--brand-primary)' }}></i>
                  Spending Allocation Breakdown
                </h3>
                {chartData ? (
                  <div style={styles.chartWrapper}>
                    <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="110" cy="110" r="80" fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
                      {chartData.map((item, idx) => {
                        const radius = 80
                        const circumference = 2 * Math.PI * radius
                        const strokeDash = (item.percentage / 100) * circumference
                        const strokeOffset = circumference - strokeDash
                        
                        let prevPercentage = 0
                        for (let i = 0; i < idx; i++) {
                          prevPercentage += chartData[i].percentage
                        }
                        const rotationOffset = (prevPercentage / 100) * circumference

                        return (
                          <circle 
                            key={item.category}
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="20"
                            strokeDasharray={`${strokeDash} ${circumference}`}
                            strokeDashoffset={-rotationOffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                          />
                        )
                      })}
                      {/* Central Text */}
                      <g style={{ transform: 'rotate(90deg)', transformOrigin: '110px 110px' }}>
                        <text x="110" y="105" textAnchor="middle" style={{ fontSize: '13px', fontWeight: 700, fill: 'var(--text-muted)' }}>
                          GRAND TOTAL
                        </text>
                        <text x="110" y="125" textAnchor="middle" style={{ fontSize: '19px', fontWeight: 800, fill: 'var(--brand-dark)' }}>
                          {formatVal(grandTotal)}
                        </text>
                      </g>
                    </svg>
                    <div style={styles.chartLegend}>
                      {Object.keys(catColors).map(cat => {
                        const spentValue = expenses
                          .filter(e => e.category === cat)
                          .reduce((sum, e) => sum + e.amount, 0)
                        return (
                          <div key={cat} style={styles.legendItem}>
                            <div style={{ ...styles.legendColorBox, backgroundColor: catColors[cat] }}></div>
                            <span style={styles.legendLabel}>{cat}</span>
                            <span style={styles.legendValue}>{formatVal(spentValue)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={styles.emptyChartContainer}>
                    <i className="fa-solid fa-chart-pie" style={styles.emptyChartIcon}></i>
                    <p>Register transactions to see spending breakdown analysis.</p>
                  </div>
                )}
              </div>

              {/* Search, Filter, and Master Ledger Table */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-list-check" style={{ color: 'var(--brand-primary)' }}></i>
                  Master Financial Ledger Registry
                </h3>

                {/* Filter and Search Bar */}
                <div style={styles.filterControls}>
                  <div style={styles.searchBox}>
                    <i className="fa-solid fa-magnifying-glass" style={styles.searchIcon}></i>
                    <input 
                      type="text" 
                      placeholder="Search by vendor..." 
                      style={styles.searchInput}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div style={styles.categoryFilters}>
                    {['All', 'Food', 'Rent', 'Entertainment', 'Other'].map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)}
                        style={{
                          ...styles.filterTabBtn,
                          backgroundColor: activeCategory === cat ? 'var(--brand-primary)' : '#f1f5f9',
                          color: activeCategory === cat ? 'white' : 'var(--text-slate)'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ledger Table */}
                <div style={styles.tableWrapper}>
                  <table style={styles.ledgerTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Vendor Designation</th>
                        <th style={styles.tableHeader}>Category</th>
                        <th style={styles.tableHeader}>Amount</th>
                        <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length > 0 ? (
                        filteredExpenses.map(exp => (
                          <tr key={exp.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              <div style={styles.vendorCell}>
                                <span style={styles.vendorName}>{exp.title}</span>
                                {(exp.isSubscription || exp.subscription) && (
                                  <span style={styles.recurringBadge}>
                                    <i className="fa-solid fa-arrows-spin"></i> Recurring
                                  </span>
                                )}
                                {exp.receiptSource && (
                                  <span style={styles.receiptLinkedBadge} title={`Linked to receipt: ${exp.receiptSource}`}>
                                    <i className="fa-solid fa-paperclip"></i> Receipt
                                  </span>
                                )}
                              </div>
                              <div style={styles.dateCell}>{exp.date}</div>
                            </td>
                            <td style={styles.tableCell}>
                              <span className={`tag tag-${(exp.category || 'Other').toLowerCase()}`}>
                                {exp.category}
                              </span>
                            </td>
                            <td style={{ ...styles.tableCell, fontWeight: 700 }}>
                              {formatVal(exp.amount)}
                            </td>
                            <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                              <button 
                                onClick={() => handleDeleteExpense(exp.id)} 
                                style={styles.deleteBtn}
                                title="Delete transaction entry"
                              >
                                <i className="fa-regular fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={styles.emptyTableState}>
                            No verified transactions matches filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div style={styles.dashboardHeader}>
              <div>
                <h2 style={styles.welcomeGreeting}>Smart Invoices Hub</h2>
                <p style={styles.headerSubtitle}>Issue corporate billing statements and track outstanding customer receivables.</p>
              </div>
            </div>

            {/* Invoices Overview Grid */}
            <div style={{ ...styles.metricsGrid, gridTemplateColumns: '1fr 1fr' }}>
              <div className="metric-card" style={styles.metricCard}>
                <div style={styles.metricInfo}>
                  <h4>Outstanding Receivables</h4>
                  <p style={{ color: 'var(--brand-primary)', fontSize: '32px' }}>{formatVal(totalReceivables)}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Total funds currently owed to your active business profile assets.
                  </p>
                </div>
                <div style={{ ...styles.metricIcon, background: '#e0e7ff', color: 'var(--brand-primary)', width: '56px', height: '56px' }}>
                  <i className="fa-solid fa-building-columns" style={{ fontSize: '24px' }}></i>
                </div>
              </div>

              <div className="metric-card" style={{ ...styles.metricCard, borderLeft: overdueInvoicesCount > 0 ? '4px solid var(--danger)' : '1px solid var(--border)' }}>
                <div style={styles.metricInfo}>
                  <h4>Overdue Breach Alerts</h4>
                  <p style={{ color: overdueInvoicesCount > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '32px' }}>
                    {overdueInvoicesCount}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Unpaid billing statements that have passed their settlement due dates.
                  </p>
                </div>
                <div style={{ 
                  ...styles.metricIcon, 
                  background: overdueInvoicesCount > 0 ? '#fee2e2' : '#d1fae5', 
                  color: overdueInvoicesCount > 0 ? 'var(--danger)' : 'var(--success)',
                  width: '56px',
                  height: '56px'
                }}>
                  <i className="fa-solid fa-bell" style={{ fontSize: '24px' }}></i>
                </div>
              </div>
            </div>

            {/* Split Invoicing Section */}
            <div style={styles.dashboardSplit}>
              {/* Issue New Invoice Form */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-file-signature" style={{ color: 'var(--brand-primary)' }}></i>
                  Issue New Invoice
                </h3>
                <p style={styles.panelDesc}>Draft client details below to generate a new smart receivable entry.</p>

                {invoiceError && (
                  <div style={styles.formErrorAlert}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                    {invoiceError}
                  </div>
                )}

                <form onSubmit={handleCreateInvoice}>
                  <div className="input-group">
                    <label>Client Corporate Name</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="e.g., Apple Enterprise Inc."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Client Contact Email</label>
                    <input 
                      type="email" 
                      className="input-control" 
                      placeholder="finance@clientcorp.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Billing Statement Value ({currencies[currencyCode].symbol})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input-control" 
                      placeholder="0.00"
                      value={invoiceValue}
                      onChange={(e) => setInvoiceValue(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Settlement Due Date</label>
                    <input 
                      type="date" 
                      className="input-control"
                      value={invoiceDueDate}
                      onChange={(e) => setInvoiceDueDate(e.target.value)}
                      required 
                    />
                  </div>

                  <button type="submit" className="btn-ui btn-solid" style={{ width: '100%' }}>
                    <i className="fa-solid fa-receipt"></i> Generate Smart Invoice Ledger
                  </button>
                </form>
              </div>

              {/* Invoice History Ledger */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-history" style={{ color: 'var(--brand-primary)' }}></i>
                  Active Smart Invoice History Ledger
                </h3>
                
                <div style={styles.tableWrapper}>
                  <table style={styles.ledgerTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Client Details</th>
                        <th style={styles.tableHeader}>Amount</th>
                        <th style={styles.tableHeader}>Due Date</th>
                        <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length > 0 ? (
                        invoices.map(inv => {
                          const due = new Date(inv.dueDate)
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const isOverdue = due < today && inv.status === 'Pending'

                          return (
                            <tr key={inv.id} style={styles.tableRow}>
                              <td style={styles.tableCell}>
                                <div style={styles.vendorName}>{inv.clientName}</div>
                                <div style={styles.dateCell}>{inv.clientEmail}</div>
                              </td>
                              <td style={{ ...styles.tableCell, fontWeight: 700 }}>
                                {formatVal(inv.amount)}
                              </td>
                              <td style={styles.tableCell}>
                                <div style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-main)', fontWeight: isOverdue ? 700 : 'normal' }}>
                                  {inv.dueDate}
                                </div>
                                {isOverdue && (
                                  <span style={{ fontSize: '10px', background: '#fee2e2', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    OVERDUE
                                  </span>
                                )}
                              </td>
                              <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                                <button 
                                  onClick={() => toggleInvoicePaid(inv.id)} 
                                  className="btn-ui"
                                  style={{ 
                                    padding: '6px 12px', 
                                    fontSize: '11px', 
                                    background: inv.status === 'Paid' ? '#d1fae5' : '#f1f5f9',
                                    color: inv.status === 'Paid' ? 'var(--success)' : 'var(--text-muted)',
                                    marginRight: '8px'
                                  }}
                                >
                                  {inv.status === 'Paid' ? 'Paid' : 'Unpaid'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteInvoice(inv.id)} 
                                  style={styles.deleteBtn}
                                >
                                  <i className="fa-regular fa-trash-can"></i>
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" style={styles.emptyTableState}>
                            No issued smart invoices registered.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallets' && (
          <div>
            <div style={styles.dashboardHeader}>
              <div>
                <h2 style={styles.welcomeGreeting}>Accounts & Liquidity Wallets</h2>
                <p style={styles.headerSubtitle}>Monitor multiple corporate wallets, issue transfers, and audit funds.</p>
              </div>
            </div>

            {/* Smart Wallet Cards */}
            <div style={{ ...styles.metricsGrid, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '40px' }}>
              
              {/* Wallet 1 */}
              <div style={{ 
                ...styles.walletCard, 
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.3)'
              }}>
                <div style={styles.walletHeader}>
                  <span>FinTrack Operating</span>
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <div style={styles.walletBalance}>
                  {formatVal(walletBalances.operating)}
                </div>
                <div style={styles.walletFooter}>
                  <span>•••• •••• •••• 4289</span>
                  <span>OP - ACC</span>
                </div>
              </div>

              {/* Wallet 2 */}
              <div style={{ 
                ...styles.walletCard, 
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.3)'
              }}>
                <div style={styles.walletHeader}>
                  <span>Impulse Reserve Shield</span>
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div style={styles.walletBalance}>
                  {formatVal(walletBalances.reserve)}
                </div>
                <div style={styles.walletFooter}>
                  <span>•••• •••• •••• 9811</span>
                  <span>RES - ACC</span>
                </div>
              </div>

              {/* Wallet 3 */}
              <div style={{ 
                ...styles.walletCard, 
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                boxShadow: '0 10px 25px -5px rgba(217, 119, 6, 0.3)'
              }}>
                <div style={styles.walletHeader}>
                  <span>Petty Cash Vault</span>
                  <i className="fa-solid fa-coins"></i>
                </div>
                <div style={styles.walletBalance}>
                  {formatVal(walletBalances.cash)}
                </div>
                <div style={styles.walletFooter}>
                  <span>•••• •••• •••• 6052</span>
                  <span>CSH - ACC</span>
                </div>
              </div>

            </div>

            {/* Split Transfers Section */}
            <div style={styles.dashboardSplit}>
              {/* Process Transfer Form */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-exchange-alt" style={{ color: 'var(--brand-primary)' }}></i>
                  Process Capital Transfer
                </h3>
                <p style={styles.panelDesc}>Redistribute assets dynamically across your registered accounts.</p>

                {walletError && (
                  <div style={styles.formErrorAlert}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                    {walletError}
                  </div>
                )}

                {walletSuccess && (
                  <div style={{ ...styles.formErrorAlert, background: '#d1fae5', color: 'var(--success)', borderLeft: '4px solid var(--success)' }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
                    {walletSuccess}
                  </div>
                )}

                <form onSubmit={handleTransfer}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Source Account</label>
                      <select 
                        className="input-control" 
                        value={transferSource}
                        onChange={(e) => setTransferSource(e.target.value)}
                      >
                        <option value="operating">FinTrack Operating</option>
                        <option value="reserve">Impulse Reserve Shield</option>
                        <option value="cash">Petty Cash Vault</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Target Account</label>
                      <select 
                        className="input-control" 
                        value={transferTarget}
                        onChange={(e) => setTransferTarget(e.target.value)}
                      >
                        <option value="operating">FinTrack Operating</option>
                        <option value="reserve">Impulse Reserve Shield</option>
                        <option value="cash">Petty Cash Vault</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Transfer Capital Amount ({currencies[currencyCode].symbol})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input-control" 
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      required 
                    />
                  </div>

                  <button type="submit" className="btn-ui btn-solid" style={{ width: '100%' }}>
                    <i className="fa-solid fa-exchange-alt"></i> Execute Capital Transfer
                  </button>
                </form>
              </div>

              {/* Wallet Audit Log */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-history" style={{ color: 'var(--brand-primary)' }}></i>
                  Wallet Audit Trail Ledger
                </h3>
                
                <div style={styles.tableWrapper}>
                  <table style={styles.ledgerTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Transfer ID</th>
                        <th style={styles.tableHeader}>Path</th>
                        <th style={styles.tableHeader}>Amount</th>
                        <th style={styles.tableHeader}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferLogs.length > 0 ? (
                        transferLogs.map(log => (
                          <tr key={log.id} style={styles.tableRow}>
                            <td style={{ ...styles.tableCell, fontFamily: 'monospace', fontWeight: 600 }}>
                              {log.id}
                            </td>
                            <td style={styles.tableCell}>
                              <div style={{ textTransform: 'capitalize', fontSize: '13px', fontWeight: 600 }}>
                                {log.source} <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 4px' }}></i> {log.target}
                              </div>
                            </td>
                            <td style={{ ...styles.tableCell, fontWeight: 700, color: 'var(--brand-primary)' }}>
                              {formatVal(log.amount)}
                            </td>
                            <td style={{ ...styles.tableCell, fontSize: '12px', color: 'var(--text-muted)' }}>
                              {log.timestamp}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={styles.emptyTableState}>
                            No recent transfers performed.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div style={styles.dashboardHeader}>
              <div>
                <h2 style={styles.welcomeGreeting}>Platform Preferences</h2>
                <p style={styles.headerSubtitle}>Configure corporate budget parameters, display options, and verification settings.</p>
              </div>
            </div>

            <div style={styles.dashboardSplit}>
              {/* Left Column: Budget Updates */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-vault" style={{ color: 'var(--brand-primary)' }}></i>
                  Update Monthly Budget
                </h3>
                <p style={styles.panelDesc}>Configure your general capital allocation limits. This updates your configuration in MySQL.</p>

                {settingsSuccess && (
                  <div style={{ ...styles.formErrorAlert, background: '#d1fae5', color: 'var(--success)', borderLeft: '4px solid var(--success)' }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
                    {settingsSuccess}
                  </div>
                )}

                {settingsError && (
                  <div style={styles.formErrorAlert}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                    {settingsError}
                  </div>
                )}

                <form onSubmit={handleUpdateBudget}>
                  <div className="input-group">
                    <label>Enter custom budget amount ({currencies[currencyCode].symbol})</label>
                    <input 
                      type="number" 
                      step="1"
                      className="input-control" 
                      placeholder="e.g., 50000"
                      value={settingsBudget}
                      onChange={(e) => setSettingsBudget(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <button type="submit" className="btn-ui btn-solid" style={{ width: '100%' }}>
                    <i className="fa-solid fa-floppy-disk"></i> Save Budget Allocation
                  </button>
                </form>
              </div>

              {/* Right Column: Currency Settings */}
              <div style={styles.sectionPanel}>
                <h3 style={styles.panelTitle}>
                  <i className="fa-solid fa-globe" style={{ color: 'var(--brand-primary)' }}></i>
                  Display Currency Configuration
                </h3>
                <p style={styles.panelDesc}>Adjust the localized formatting and currency conversions dynamically across the ledger shell.</p>

                <div className="input-group">
                  <label>Selected Display Currency</label>
                  <select 
                    className="input-control"
                    value={currencyCode}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                  >
                    {Object.keys(currencies).map(code => (
                      <option key={code} value={code}>
                        {currencies[code].label} ({currencies[code].symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.settingsAlertBox}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: '16px', color: 'var(--brand-primary)', marginRight: '10px' }}></i>
                  <p style={{ fontSize: '13px', color: 'var(--text-slate)', lineHeight: '1.5' }}>
                    <strong>Note:</strong> Internal ledger registry balances and database transactions remain stored securely in a standardized base currency, while conversions are calculated on-the-fly dynamically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Render Auto-Receipt Matching Tab */}
        {activeTab === 'receipts' && (
          <div>
            <div style={styles.dashboardHeader}>
              <div>
                <h2 style={styles.welcomeGreeting}>Auto-Receipt Matching Hub</h2>
                <p style={styles.headerSubtitle}>Scan email inboxes and phone galleries to automatically match digital receipts with bank account transactions.</p>
              </div>
            </div>

            {receiptSuccessMsg && (
              <div style={{ ...styles.formErrorAlert, background: '#d1fae5', color: 'var(--success)', borderLeft: '4px solid var(--success)', marginBottom: '24px', animation: 'slideDown 0.3s ease' }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
                {receiptSuccessMsg}
              </div>
            )}

            {receiptsError && (
              <div style={{ ...styles.formErrorAlert, marginBottom: '24px', animation: 'slideDown 0.3s ease' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                {receiptsError}
              </div>
            )}

            {/* Sync Sources Panel */}
            <div style={{ ...styles.dashboardSplit, marginBottom: '24px' }}>
              <div style={{ ...styles.sectionPanel, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ ...styles.panelTitle, margin: 0 }}>
                    <i className="fa-solid fa-envelope-open-text" style={{ color: 'var(--brand-primary)', marginRight: '8px' }}></i>
                    Email Inbox Scan
                  </h3>
                  <label style={styles.switchContainer}>
                    <input 
                      type="checkbox" 
                      checked={syncEmailConnected} 
                      onChange={(e) => setSyncEmailConnected(e.target.checked)}
                      style={styles.switchInput}
                    />
                    <span style={{ ...styles.switchSlider, backgroundColor: syncEmailConnected ? 'var(--brand-primary)' : '#cbd5e1' }}></span>
                  </label>
                </div>
                <p style={styles.panelDesc}>Connects securely to your live IMAP account (e.g. Gmail App Password) to extract receipt details.</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', marginBottom: '12px' }}>
                  <span style={{ ...styles.pulseStatus, background: syncEmailConnected && imapConfigured ? 'var(--success)' : 'var(--warning)' }}></span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-slate)' }}>
                    {!syncEmailConnected ? 'Sync Channel Disabled' : imapConfigured ? `Connected (${imapUsername})` : 'Credentials Required (Demo Mode)'}
                  </span>
                </div>

                {syncEmailConnected && (
                  <div style={{ marginTop: '12px' }}>
                    <button 
                      onClick={() => setShowImapSettings(!showImapSettings)} 
                      className="btn-ui btn-outline" 
                      style={{ padding: '8px 12px', fontSize: '12.5px', width: '100%', marginBottom: '10px' }}
                    >
                      <i className="fa-solid fa-gears"></i> {imapConfigured ? 'Update IMAP Credentials' : 'Link Secure IMAP Server'}
                    </button>
                  </div>
                )}

                {showImapSettings && (
                  <form onSubmit={handleSaveImapSettings} style={styles.imapForm}>
                    <div className="input-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11.5px' }}>IMAP Host Address</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        style={{ padding: '8px', fontSize: '13px' }}
                        placeholder="e.g. imap.gmail.com" 
                        value={imapHost} 
                        onChange={(e) => setImapHost(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11.5px' }}>IMAP Port Number</label>
                      <input 
                        type="number" 
                        className="input-control" 
                        style={{ padding: '8px', fontSize: '13px' }}
                        placeholder="993" 
                        value={imapPort} 
                        onChange={(e) => setImapPort(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11.5px' }}>Email Address</label>
                      <input 
                        type="email" 
                        className="input-control" 
                        style={{ padding: '8px', fontSize: '13px' }}
                        placeholder="user@example.com" 
                        value={imapUsername} 
                        onChange={(e) => setImapUsername(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '11.5px' }}>App Password / Security Token</label>
                      <input 
                        type="password" 
                        className="input-control" 
                        style={{ padding: '8px', fontSize: '13px' }}
                        placeholder="e.g. abcd-efgh-ijkl-mnop" 
                        value={imapPassword} 
                        onChange={(e) => setImapPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    <button type="submit" className="btn-ui btn-solid" style={{ width: '100%', padding: '8px', fontSize: '13px' }}>
                      <i className="fa-solid fa-shield-halved"></i> Save IMAP Credentials
                    </button>
                  </form>
                )}
              </div>

              <div style={{ ...styles.sectionPanel, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ ...styles.panelTitle, margin: 0 }}>
                    <i className="fa-solid fa-images" style={{ color: 'var(--brand-primary)', marginRight: '8px' }}></i>
                    Phone Gallery Sync
                  </h3>
                  <label style={styles.switchContainer}>
                    <input 
                      type="checkbox" 
                      checked={syncGalleryConnected} 
                      onChange={(e) => setSyncGalleryConnected(e.target.checked)}
                      style={styles.switchInput}
                    />
                    <span style={{ ...styles.switchSlider, backgroundColor: syncGalleryConnected ? 'var(--brand-primary)' : '#cbd5e1' }}></span>
                  </label>
                </div>
                <p style={styles.panelDesc}>Allows uploading physical photos of receipts. Tesseract OCR will read, digitize, and match details.</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', marginBottom: '12px' }}>
                  <span style={{ ...styles.pulseStatus, background: syncGalleryConnected ? 'var(--success)' : 'var(--danger)' }}></span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-slate)' }}>
                    {syncGalleryConnected ? 'Local Sandbox Sync Active' : 'Gallery Scanning Disabled'}
                  </span>
                </div>

                {syncGalleryConnected && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={styles.uploadBtnWrapper}>
                      <button className="btn-ui btn-outline" style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px' }}>
                        <i className="fa-solid fa-camera-retro"></i> Select Gallery Receipt Photos
                      </button>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleGalleryUpload} 
                        style={styles.hiddenFileInput}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sync Trigger and Control Bar */}
            <div style={styles.receiptActionPanel}>
              <button 
                onClick={handleScanReceipts} 
                className="btn-ui btn-solid" 
                disabled={receiptsLoading}
                style={{ minWidth: '180px' }}
              >
                {receiptsLoading ? (
                  <>
                    <i className="fa-solid fa-arrows-spin fa-spin"></i> Syncing Channels...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-rotate"></i> Scan Channels
                  </>
                )}
              </button>

              {scannedReceipts.filter(r => r.matchStatus === 'EXACT').length > 0 && (
                <button 
                  onClick={handleAutoMatchAll} 
                  className="btn-ui btn-success"
                  disabled={receiptsLoading}
                  style={{ animation: 'pulseBorder 2s infinite' }}
                >
                  <i className="fa-solid fa-bolt"></i> Auto-Link Exact Matches ({scannedReceipts.filter(r => r.matchStatus === 'EXACT').length})
                </button>
              )}
            </div>

            {/* Receipts Listing */}
            {receiptsLoading && (
              <div style={styles.receiptScanLoader}>
                <div style={styles.loaderPulseBar}></div>
                <p style={{ fontWeight: 600, color: 'var(--brand-primary)', marginTop: '12px' }}>
                  Connecting to secure IMAP servers and device sandboxes...
                </p>
              </div>
            )}

            {!receiptsLoading && scannedReceipts.length === 0 && (
              <div style={styles.receiptEmptyCard}>
                <i className="fa-solid fa-magnifying-glass-dollar" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
                <h4 style={{ fontWeight: 700, fontSize: '18px', color: 'var(--brand-dark)', marginBottom: '8px' }}>No Scanned Records Loaded</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
                  Connect your accounts and click "Scan Channels" above to look for digital receipt artifacts.
                </p>
                <button onClick={handleScanReceipts} className="btn-ui btn-outline">
                  <i className="fa-solid fa-radar"></i> Run Initial Sync Scan
                </button>
              </div>
            )}

            {!receiptsLoading && scannedReceipts.length > 0 && (
              <div>
                {/* Status Filters */}
                <div style={styles.receiptFilterRow}>
                  {['all', 'exact', 'partial', 'none'].map((status) => {
                    const count = status === 'all' 
                      ? scannedReceipts.length 
                      : scannedReceipts.filter(r => r.matchStatus.toLowerCase() === status).length;
                    const isActive = receiptFilter === status;
                    return (
                      <button 
                        key={status}
                        onClick={() => setReceiptFilter(status)}
                        style={{
                          ...styles.receiptFilterTab,
                          background: isActive ? 'var(--brand-primary)' : 'var(--card-bg)',
                          color: isActive ? 'white' : 'var(--text-slate)',
                          border: isActive ? 'none' : '1px solid var(--border)'
                        }}
                      >
                        {status.toUpperCase()} ({count})
                      </button>
                    )
                  })}
                </div>

                {/* Scanned Items grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {scannedReceipts
                    .filter(receipt => receiptFilter === 'all' || receipt.matchStatus.toLowerCase() === receiptFilter)
                    .map(receipt => {
                      const isExact = receipt.matchStatus === 'EXACT';
                      const isPartial = receipt.matchStatus === 'PARTIAL';
                      const isNone = receipt.matchStatus === 'NONE';

                      return (
                        <div key={receipt.id} style={{ ...styles.receiptCard, borderLeft: isExact ? '5px solid var(--success)' : isPartial ? '5px solid var(--warning)' : '5px solid var(--danger)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <div style={{
                                ...styles.receiptSourceIcon,
                                background: receipt.source === 'EMAIL' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: receipt.source === 'EMAIL' ? 'var(--brand-primary)' : 'var(--success)'
                              }}>
                                <i className={receipt.source === 'EMAIL' ? "fa-solid fa-envelope" : "fa-solid fa-image"}></i>
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 4px 0', color: 'var(--brand-dark)' }}>{receipt.merchant}</h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>{receipt.sourceName}</p>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-slate)', marginRight: '12px' }}>
                                  <i className="fa-solid fa-calendar-day" style={{ marginRight: '4px' }}></i> {receipt.date}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-dark)' }}>
                                  Amount: {currencies[currencyCode].symbol}{(receipt.amount * currencies[currencyCode].rate).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '8px' }}>
                              {isExact && (
                                <>
                                  <span style={styles.badgeExact}>
                                    <i className="fa-solid fa-circle-check"></i> Exact Match Found
                                  </span>
                                  {receipt.matchedExpenseId && (
                                    <span style={{ fontSize: '12.5px', color: 'var(--text-slate)' }}>
                                      Matches <strong>{receipt.matchedExpenseTitle}</strong>
                                    </span>
                                  )}
                                  {receipt.matchedExpenseTitle !== 'Linked Transaction' && (
                                    <button 
                                      onClick={() => handleLinkReceipt(receipt, receipt.matchedExpenseId)}
                                      className="btn-ui btn-solid"
                                      style={{ padding: '6px 12px', fontSize: '12px' }}
                                    >
                                      Link & Verify
                                    </button>
                                  )}
                                </>
                              )}

                              {isPartial && (
                                <>
                                  <span style={styles.badgePartial}>
                                    <i className="fa-solid fa-circle-exclamation"></i> Potential Match
                                  </span>
                                  {receipt.matchedExpenseId && (
                                    <span style={{ fontSize: '12.5px', color: 'var(--text-slate)' }}>
                                      Matches <strong>{receipt.matchedExpenseTitle}</strong> (Verify amount/date)
                                    </span>
                                  )}
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                      onClick={() => handleLinkReceipt(receipt, receipt.matchedExpenseId)}
                                      className="btn-ui btn-solid"
                                      style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--warning)', boxShadow: 'none' }}
                                    >
                                      Confirm Match
                                    </button>
                                    <button 
                                      onClick={() => setManualLinkReceipt(manualLinkReceipt === receipt.id ? null : receipt.id)}
                                      className="btn-ui btn-outline"
                                      style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                                    >
                                      Choose Custom
                                    </button>
                                  </div>
                                </>
                              )}

                              {isNone && (
                                <>
                                  <span style={styles.badgeNone}>
                                    <i className="fa-solid fa-circle-question"></i> No Bank Record
                                  </span>
                                  <button 
                                    onClick={() => handleCreateAndLinkReceipt(receipt)}
                                    className="btn-ui btn-solid"
                                    style={{ padding: '8px 16px', fontSize: '12px' }}
                                  >
                                    Log as Bank Transaction
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Manual Selection Interface */}
                          {manualLinkReceipt === receipt.id && (
                            <div style={styles.manualLinkPanel}>
                              <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--brand-dark)' }}>
                                Select transaction from ledger matching: {currencies[currencyCode].symbol}{(receipt.amount * currencies[currencyCode].rate).toFixed(2)}
                              </h5>
                              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {expenses.filter(e => !e.receiptSource).map(exp => (
                                  <div 
                                    key={exp.id} 
                                    onClick={() => handleLinkReceipt(receipt, exp.id)}
                                    style={styles.manualLinkItem}
                                  >
                                    <span><strong>{exp.title}</strong> ({exp.category}) - {exp.date}</span>
                                    <strong>{formatVal(exp.amount)}</strong>
                                  </div>
                                ))}
                                {expenses.filter(e => !e.receiptSource).length === 0 && (
                                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                                    No unmatched bank line items found.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--brand-light)',
  },
  loadingSpinner: {
    fontSize: '48px',
    color: 'var(--brand-primary)',
  },
  dashboardContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--brand-light)',
  },
  sidebar: {
    backgroundColor: 'var(--sidebar-bg)',
    color: 'white',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 99,
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  brandWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: '800',
    marginBottom: '40px',
    color: '#f8fafc',
    overflow: 'hidden',
  },
  brandIcon: {
    color: '#818cf8',
    fontSize: '22px',
    flexShrink: 0,
  },
  brandName: {
    whiteSpace: 'nowrap',
  },
  navMenu: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    borderRadius: '8px',
    transition: '0.2s',
    cursor: 'pointer',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontWeight: '600',
    borderRadius: '8px',
    width: '100%',
    transition: 'all 0.2s',
  },
  navIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  collapseBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: '#94a3b8',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '20px',
    alignSelf: 'center',
    width: '32px',
    transition: '0.2s',
  },
  profileDeckContainer: {
    position: 'relative',
    marginTop: 'auto',
    width: '100%',
  },
  userProfileRow: {
    cursor: 'pointer',
    borderRadius: '10px',
    transition: '0.2s',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.04)',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    background: '#818cf8',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    color: 'white',
    flexShrink: 0,
  },
  userProfileInfo: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  profileUserHandle: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profilePlan: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0,
  },
  profileDots: {
    marginLeft: 'auto',
    color: '#64748b',
    fontSize: '14px',
  },
  profileDropdown: {
    position: 'absolute',
    bottom: '60px',
    width: '200px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.08)',
    padding: '16px',
    zIndex: 999,
    color: '#1e293b',
    textAlign: 'left',
    animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  dropdownHeader: {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '10px',
    marginBottom: '10px',
  },
  dropdownLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    marginBottom: '2px',
  },
  dropdownValue: {
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'monospace',
    color: 'var(--brand-primary)',
  },
  signoutBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  mainContent: {
    flex: 1,
    padding: '40px 60px',
    maxWidth: '1300px',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  welcomeGreeting: {
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.8px',
    textAlign: 'left',
  },
  headerSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '14.5px',
    marginTop: '4px',
    textAlign: 'left',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
    marginBottom: '36px',
  },
  metricCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    padding: '24px',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s',
  },
  metricInfo: {
    textAlign: 'left',
  },
  metricIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  dashboardSplit: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '36px',
    alignItems: 'start',
  },
  sectionPanel: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    padding: '32px',
    borderRadius: '18px',
    boxShadow: 'var(--shadow-sm)',
  },
  panelTitle: {
    fontSize: '19px',
    fontWeight: '700',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textAlign: 'left',
  },
  panelDesc: {
    fontSize: '13.5px',
    color: 'var(--text-muted)',
    marginBottom: '20px',
    textAlign: 'left',
  },
  ocrStatusMessage: {
    fontSize: '13px',
    fontWeight: '600',
    marginTop: '16px',
    textAlign: 'left',
  },
  formErrorAlert: {
    background: '#fee2e2',
    color: 'var(--danger)',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    borderLeft: '4px solid var(--danger)',
    textAlign: 'left',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
    marginBottom: '20px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  chartWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '20px 0',
  },
  chartLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13.5px',
  },
  legendColorBox: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  legendLabel: {
    color: 'var(--text-slate)',
    fontWeight: 600,
    width: '100px',
    textAlign: 'left',
  },
  legendValue: {
    fontWeight: 700,
    color: 'var(--brand-dark)',
  },
  emptyChartContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    color: 'var(--text-muted)',
    gap: '12px',
  },
  emptyChartIcon: {
    fontSize: '44px',
  },
  filterControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px 12px 40px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14.5px',
    outline: 'none',
    background: '#f8fafc',
    transition: '0.2s',
  },
  categoryFilters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterTabBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginTop: '15px',
  },
  ledgerTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeader: {
    padding: '12px 16px',
    borderBottom: '2px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '16px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  vendorCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  vendorName: {
    fontWeight: '600',
    color: 'var(--brand-dark)',
  },
  recurringBadge: {
    fontSize: '10.5px',
    background: '#fff1f2',
    color: '#f43f5e',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  receiptLinkedBadge: {
    fontSize: '10.5px',
    background: '#ecfdf5',
    color: '#10b981',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '6px',
  },
  switchContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '40px',
    height: '20px',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: '.3s',
    borderRadius: '20px',
  },
  pulseStatus: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)',
    animation: 'pulseBorder 1.5s infinite',
  },
  receiptActionPanel: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    background: 'var(--card-bg)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    marginBottom: '24px',
  },
  receiptScanLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  loaderPulseBar: {
    width: '120px',
    height: '4px',
    background: 'var(--brand-primary)',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'hidden',
  },
  receiptEmptyCard: {
    padding: '60px 40px',
    textAlign: 'center',
    background: 'var(--card-bg)',
    border: '2px dashed var(--border)',
    borderRadius: '16px',
    animation: 'fadeIn 0.3s ease',
  },
  receiptFilterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  receiptFilterTab: {
    padding: '8px 16px',
    fontSize: '12.5px',
    fontWeight: 700,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  receiptCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '18px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    animation: 'fadeIn 0.3s ease',
  },
  receiptSourceIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  badgeExact: {
    fontSize: '12px',
    background: '#ecfdf5',
    color: '#047857',
    padding: '4px 10px',
    borderRadius: '20px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgePartial: {
    fontSize: '12px',
    background: '#fffbeb',
    color: '#b45309',
    padding: '4px 10px',
    borderRadius: '20px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgeNone: {
    fontSize: '12px',
    background: '#fef2f2',
    color: '#b91c1c',
    padding: '4px 10px',
    borderRadius: '20px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  manualLinkPanel: {
    marginTop: '16px',
    padding: '14px',
    background: 'var(--brand-light)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    animation: 'slideDown 0.2s ease',
  },
  manualLinkItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  imapForm: {
    background: 'var(--brand-light)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '10px',
    animation: 'slideDown 0.25s ease',
  },
  uploadBtnWrapper: {
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-block',
    width: '100%',
  },
  hiddenFileInput: {
    fontSize: '100px',
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    cursor: 'pointer',
    width: '100%',
    height: '100%',
  },
  dateCell: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  deleteBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '15px',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  emptyTableState: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 0',
  },

  // Wallet Specific Styles
  walletCard: {
    borderRadius: '20px',
    padding: '30px 24px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '200px',
    transition: 'transform 0.3s',
    cursor: 'default',
  },
  walletHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 600,
    opacity: 0.9,
  },
  walletBalance: {
    fontSize: '32px',
    fontWeight: 800,
    margin: '15px 0',
  },
  walletFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  settingsAlertBox: {
    display: 'flex',
    alignItems: 'flex-start',
    background: '#eff6ff',
    padding: '16px',
    borderRadius: '12px',
    marginTop: '20px',
  }
}
