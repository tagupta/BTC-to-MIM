import React, { Component } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import './Welcome.css';

export default class Welcome extends Component {

  handleClose = () => {
  this.props.handleDetails(false);
  }

  render() {
   
    return (
          <div>
            <Dialog open={this.props.openDetails}
                    onClose={this.handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                <strong><p id='modalTitle'>{"Guidelines for using this Dapp"}</p></strong>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        
                           <strong style={{color:"#b406c4"}}>Description of the dapp:</strong><br></br>
                           Deposit BTC to borrow MIM and 
                           Repay MIM to get BTC back.
                           <br></br><br></br>
                           <strong style={{color:"#b406c4"}}>Instructions:</strong><br></br>
                           You are encouraged to use sufficient funds to use the dapp seamlessly.  <br></br>
                           You are advised to sign transactions as soon as the metamask window pops up.<br></br>
                           1 MIM = 1 USD <br></br>
                           1 cvxrencrv = 42304.3455 MIM <br></br>
                           Collateralization ratio is set to 25% [SAFE] <br></br>
                           Ask admin to provide more MIM to complete repay operation
                    </DialogContentText>
                </DialogContent>
                <DialogActions id='buttonFooter'>
                    <Button id='buttonText' onClick={this.handleClose} autoFocus><strong>Close</strong></Button>
                </DialogActions>
            </Dialog>
          </div>
        );
  }
}
