; File: TrendsI2.c  - Determine the lengths of the trends
;
; Date: April 2026
;
; Author(s):  Benjamin Maldonado
;
; Collaboration: None
;
; Known Flaws: Final check is probably not needed
;-------------------s--------------------------------------------
        br      rArray
;*******************************************************************
;Printing Tools
space:   .ASCII  " \x00"
colon:   .ASCII  ": \x00"
nl:      .ASCII  "\n\x00"
finish:  .ASCII  "DONE! \x00"
negMSG:  .ASCII  "The longest negative trend is of length \x00"    
frm:     .ASCII  " from \x00"
to:      .ASCII  " to \x00"
posMSG:  .ASCII  "The longest positive trend is of length \x00"  

;Constants
ZERO:    .EQUATE 0
NEG:     .EQUATE -1
POS:     .EQUATE 1
LIM:     .EQUATE 128
;Stack Variables
inLen:    .EQUATE 2
inFin:    .EQUATE 4
inStart:  .EQUATE 6
inStartC: .EQUATE 8
argTot:   .EQUATE 8    ;for better keeping track
;Arrays
array:   .BLOCK  128     ;Array of values
change:  .BLOCK  128     ;Array of differences
;Variables
NUM:     .WORD  0    ;iterator for rArray
value:   .BLOCK 2    ;stores input         
current: .WORD  0    ;last entry to array[] for the purpose of making change[]
NegPos:  .WORD  0    ;if trend pos or neg
length:  .WORD  0    ;trend length
int:     .WORD  0    ;i for main
iDiv2:   .WORD  0    ;For interation of main print, i/2
; Longest Trend Variables  
lstIdx: .WORD  0    ; tracks last byte offset visited
longN:   .WORD  0    ; Neg Trend
negStr:  .WORD  0    ; |  
negFin:  .WORD  0    ; | 
negS:    .WORD  0    ; |
negF:    .WORD  0    ; ^
longP:   .WORD  0    ; Pos Trend  
posStr:  .WORD  0    ; |  
posFin:  .WORD  0    ; | 
posS:    .WORD  0    ; |
posF:    .WORD  0    ; ^
;Each side has one for current longest and its start and end and the current trend,
;********************************************************************
long:   NOP0
        LDWA    length,d
        CPWA    inLen,s
        BRLE    skip
        SUBX    2,i
        STWA    inLen,s   
        LDWA    array,x 
        STWA    inFin,s
        LDWA    inStartC,s 
        STWA    inStart,s
        ADDX    2,i
skip:   RET


;Fills arrays
rArray: LDWA    LIM,i       ;while  
        CPWA    NUM,d
        BREQ    main
        DECI    value,d     
        LDWA    value,d
        CPWA    0,i
        BREQ    main
        LDWX    NUM,d       ;Load value into Array
        STWA    array,x     ;^
        SUBA    current,d
        STWA    change,x
        LDWA    array,x     ;current = array-1
        STWA    current,d   ;^
        LDWA    NUM,d       ;n+1
        ADDA    2,i         ;|
        STWA    NUM,d       ;^     
        BR      rArray
        


main:   NOP0
        LDWA    int,d       ; for(int;int<NUM)
        ASLA
        CPWA    NUM,d       ;
        BREQ    finChq      ; 
        LDWX    int,d       ;
        ASLX                ;Shift int for use in arrays
        DECO    int,d       ; print i
        STRO    colon,d     ; print ": "
        DECO    array,x     ; print array[i]
        STRO    space,d     ; print " "
        DECO    change,x    ; print change[i]
        STRO    space,d     ; print " "
        LDWA    NegPos,d    ;if(NegPOS == POS)but checks all others first
        CPWA    POS,i       ; |if pos
        BREQ    chNeg       ; |
        CPWA    NEG,i       ; |if neg
        BRNE    chInt       ; |if !neg && !pos
        LDWA    change,x    ; |if change[i] > 0 
        CPWA    0,i         ; | |
        BRLE    incr        ; | |
        NOP0                ; ...
        SUBSP   argTot,i    ;Using parameters to use subprogram
        LDWA    longN,d     ;parameter loaded on stack
        STWA    0,s         ; |
        LDWA    negFin,d    ; |
        STWA    2,s         ; |
        LDWA    negStr,d    ; |
        STWA    4,s         ; |
        LDWA    negS,d      ; |
        STWA    6,s         ; ^
        CALL    long        ;Call long
        LDWA    0,s         ;Results recorded
        STWA    longN,d     ; |
        LDWA    2,s         ; |
        STWA    negFin,d    ; |
        LDWA    4,s         ; |
        STWA    negStr,d    ; |
        ADDSP   argTot,i    ; ^
        NOP0                ; ...
        LDWA    array,x     ; | |
        STWA    posS,d      ; | |    
        LDWA    POS,i       ; | |NegPos = POS
        STWA    NegPos,d    ; | |
        LDWA    0,i         ; | |length = 0
        STWA    length,d    ; ^ ^
        br      incr      

chNeg:  LDWA    change,x    ; if(NegPOS == NEG)
        CPWA    0,i         ; |
        BRGE    incr        ; |if change >= 0
        NOP0                ;...
        SUBSP   argTot,i    ;Using parameters to use subprogram
        LDWA    longP,d     ;parameter loaded on stack
        STWA    0,s         ; |
        LDWA    posFin,d    ; |
        STWA    2,s         ; |
        LDWA    posStr,d    ; |
        STWA    4,s         ; |
        LDWA    posS,d      ; |
        STWA    6,s         ; ^
        CALL    long        ;Call long
        LDWA    0,s         ;Results recorded
        STWA    longP,d     ; |
        LDWA    2,s         ; |
        STWA    posFin,d    ; |
        LDWA    4,s         ; |
        STWA    posStr,d    ; |
        ADDSP   argTot,i    ; ^
        NOP0                ; ...
        LDWA    array,x     ; | |
        STWA    negS,d      ; | | 
        LDWA    NEG,i       ; |
        STWA    NegPos,d    ; |NegPos = NEG
        LDWA    0,i         ; |length = 0
        STWA    length,d    ; ^
        BR      incr

chInt:  LDWA    change,x    ;else:
        CPWA    0,i         ; |
        BRGT    inPos       ; | if change[i]<0
        LDWA    array,x     ; |
        STWA    negS,d      ; |
        LDWA    NEG,i       ; | |
        STWA    NegPos,d    ; | |
        br      incr        ; | ^
inPos:  LDWA    array,x     ; |
        STWA    posS,d      ; |
        LDWA    POS,i       ; | if change[i]>0
        STWA    NegPos,d    ; ^

incr:   LDWA    length,d    ; Increments relevant variables 
        ADDA    1,i         ; length++
        STWA    length,d    ; ^
        DECO    NegPos,d    ; print change[i]
        STRO    colon,d     ; print ": "
        DECO    length,d    ; print length
        STRO    nl,d        ; newline
        LDWA    int,d       ;int+=1    
        ADDA    1,i         
        STWA    int,d
        BR      main

finChq: NOP0                    ; runs the same flip check one last time 
        ADDX    2,i
        LDWA    NegPos,d
        CPWA    NEG,i
        BRGT    lastPos
        SUBSP   argTot,i    ;Using parameters to use subprogram
        LDWA    longN,d     ;parameter loaded on stack
        STWA    0,s         ; |
        LDWA    negFin,d    ; |
        STWA    2,s         ; |
        LDWA    negStr,d    ; |
        STWA    4,s         ; |
        LDWA    negS,d      ; |
        STWA    6,s         ; ^
        CALL    long        ;Call long
        LDWA    0,s         ;Results recorded
        STWA    longN,d     ; |
        LDWA    2,s         ; |
        STWA    negFin,d    ; |
        LDWA    4,s         ; |
        STWA    negStr,d    ; |
        ADDSP   argTot,i    ; ^
        BR      DONE

lastPos:SUBSP   argTot,i    ;Using parameters to use subprogram
        LDWA    longP,d     ;parameter loaded on stack
        STWA    0,s         ; |
        LDWA    posFin,d    ; |
        STWA    2,s         ; |
        LDWA    posStr,d    ; |
        STWA    4,s         ; |
        LDWA    posS,d      ; |
        STWA    6,s         ; ^
        CALL    long        ;Call long
        LDWA    0,s         ;Results recorded
        STWA    longP,d     ; |
        LDWA    2,s         ; |
        STWA    posFin,d    ; |
        LDWA    4,s         ; |
        STWA    posStr,d    ; |
        ADDSP   argTot,i    ; ^
 

DONE:   NOP0
        STRO    posMSG,d     ; printing longest pos msg
        DECO    longP,d      ; |
        STRO    nl,d         ; |
        STRO    frm,d        ; |
        DECO    posStr,d     ; |       
        STRO    to,d         ; |
        DECO    posFin,d     ; ^
        STRO    nl,d         ; newline
        STRO    negMSG,d     ; printing longest neg msg
        DECO    longN,d      ; |
        STRO    nl,d         ; |
        STRO    frm,d        ; |
        DECO    negStr,d     ; |       
        STRO    to,d         ; |
        DECO    negFin,d     ; ^
        STRO    nl,d         ; newline
        STRO    finish,d     ; print "DONE! "
        STRO    nl,d         ; newline
        STOP
        .END